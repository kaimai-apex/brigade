import { NextResponse } from "next/server";
import {
  dbClaimWebhookEvent,
  dbFinishWebhookEvent,
  dbReleaseWebhookEvent,
  dbFindPaidAfterRelease,
  dbFindMentorByPayoutAccountId,
  dbGetBooking,
  dbGetBookingByCheckoutSession,
  dbGetBookingByPaymentIntent,
  dbMarkBookingPaid,
  dbRecordRefund,
  dbSetPayoutsEnabled,
} from "@/lib/server/mentorship-db";
import { dbNotify } from "@/lib/server/notify-db";
import { getPaymentProvider, getWebhookSecret } from "@/lib/server/payments";
import {
  verifyWebhookSignature,
  WebhookSignatureError,
} from "@/lib/mentorship/webhook-signature";

/**
 * Stripe's side of the conversation.
 *
 * This is the only thing that can turn a held slot into a confirmed session,
 * because it is the only thing that knows the money actually moved. Everything
 * about it is written for a hostile caller: the URL is public, so the signature
 * check is the entire authentication story.
 *
 * Three properties this route has to keep:
 *
 *  1. Unsigned requests do nothing. No secret configured means it refuses to
 *     run at all rather than trusting the body.
 *  2. The same event delivered twice has the same effect as once. Stripe
 *     retries until it sees a 2xx and sometimes after, and a second
 *     confirmation would notify both people again.
 *  3. A handler that genuinely fails returns 5xx and releases its claim, so
 *     Stripe's retry can succeed later instead of being skipped as a duplicate.
 */

/** Stripe events this route acts on. Anything else is acknowledged and ignored. */
type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      object?: string;
      payment_intent?: string | null;
      payment_status?: string | null;
      amount_total?: number | null;
      charges_enabled?: boolean;
      metadata?: Record<string, string> | null;
      // Present on charge.refunded.
      refunds?: { data?: Array<{ id: string; amount: number }> };
      amount_refunded?: number;
    };
  };
};

export async function POST(request: Request) {
  const secret = getWebhookSecret();
  if (!secret) {
    // Not an error the caller can fix, and not something to guess around: with
    // no secret there is no way to tell Stripe from anyone else.
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set — refusing the request");
    return NextResponse.json({ message: "Webhooks are not configured" }, { status: 503 });
  }

  // The EXACT bytes Stripe signed. Parsing and re-serialising would change key
  // order and whitespace, and the signature would never match again.
  const payload = await request.text();

  try {
    verifyWebhookSignature({
      payload,
      header: request.headers.get("stripe-signature"),
      secret,
    });
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      console.warn("[stripe/webhook] rejected:", error.message);
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ message: "Body is not JSON" }, { status: 400 });
  }
  if (!event?.id || !event?.type) {
    return NextResponse.json({ message: "Not a Stripe event" }, { status: 400 });
  }

  // The INSERT is the lock. Two concurrent deliveries race on the primary key
  // and exactly one wins.
  const claimed = await dbClaimWebhookEvent(event.id, event.type);
  if (!claimed) {
    // Already handled. 200 so Stripe stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
    await dbFinishWebhookEvent(event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[stripe/webhook] ${event.type} ${event.id} failed:`, message);
    // Give the claim back so Stripe's retry is processed rather than skipped as
    // a duplicate. Recording the reason first means a permanently failing event
    // is still diagnosable.
    await dbFinishWebhookEvent(event.id, message).catch(() => null);
    await dbReleaseWebhookEvent(event.id).catch(() => null);
    return NextResponse.json({ message: "Handler failed" }, { status: 500 });
  }
}

async function handleEvent(event: StripeEvent): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event);
      return;

    case "charge.refunded":
      await onChargeRefunded(event);
      return;

    case "account.updated":
      await onAccountUpdated(event);
      return;

    default:
      // Acknowledged without acting. Stripe sends a lot that Brigade has no
      // opinion about, and 400-ing them would look like an outage on their
      // dashboard.
      return;
  }
}

async function onCheckoutCompleted(event: StripeEvent): Promise<void> {
  const checkoutSessionId = event.data.object.id;
  if (!checkoutSessionId) throw new Error("checkout.session.completed with no session id");

  // Platform "Book a call" Checkout — no mentorship booking row. Ack and stop.
  if (event.data.object.metadata?.brigade_kind === "book_call") {
    if (event.data.object.payment_status && event.data.object.payment_status !== "paid") {
      throw new Error(
        `book_call session ${checkoutSessionId} payment_status=${event.data.object.payment_status}`,
      );
    }
    return;
  }

  const paymentIntentId = event.data.object.payment_intent ?? null;
  const paymentStatus = event.data.object.payment_status ?? null;
  const amountTotal = event.data.object.amount_total;

  // Defense in depth: Checkout amounts are set server-side from the booking
  // row, but we still refuse to confirm if Stripe's event disagrees.
  const held = await dbGetBookingByCheckoutSession(checkoutSessionId);
  if (held && held.status === "pending_payment") {
    if (paymentStatus && paymentStatus !== "paid") {
      throw new Error(
        `checkout.session.completed for ${checkoutSessionId} has payment_status=${paymentStatus}`,
      );
    }
    if (typeof amountTotal === "number" && amountTotal !== held.priceCents) {
      throw new Error(
        `checkout amount mismatch for booking ${held.id}: stripe=${amountTotal} booking=${held.priceCents}`,
      );
    }
  }

  const booking = await dbMarkBookingPaid({
    checkoutSessionId,
    paymentIntentId,
    // Stripe's own receipt lives on the charge, which this event does not
    // carry. The receipt page links out to Stripe using the PaymentIntent
    // instead, so nothing is fabricated here.
    receiptUrl: null,
  });

  if (!booking) {
    /**
     * Nothing was waiting to be confirmed. Either this is a redelivery of an
     * event already applied — harmless — or the slot was released before the
     * payment landed, which means Brigade is holding money for a session that
     * will not happen. The hold window is longer than the checkout window
     * specifically so this cannot occur, but money is not a place to rely on
     * that, so it is refunded rather than kept.
     */
    const stranded = await dbFindPaidAfterRelease(checkoutSessionId);
    if (stranded && paymentIntentId) {
      console.error(
        `[stripe/webhook] payment landed after the hold was released (booking ${stranded.id}) — refunding`,
      );
      const refund = await getPaymentProvider().refundCharge({
        paymentIntentId,
        amountCents: stranded.priceCents,
        reason: "requested_by_customer",
      });
      await dbRecordRefund(stranded.id, refund.refundId, refund.amountCents);
      await dbNotify(stranded.menteeUserId, "mentorship_refunded", {
        bookingId: stranded.id,
        amountCents: refund.amountCents,
        currency: stranded.currency,
        reason: "That time was released before the payment came through, so you were refunded.",
      });
    }
    return;
  }

  // Both parties, because a confirmed session is news to both of them.
  await Promise.all([
    dbNotify(booking.menteeUserId, "mentorship_confirmed", {
      bookingId: booking.id,
      actorId: booking.mentorUserId,
      startsAt: booking.startsAt,
      confirmationCode: booking.confirmationCode,
    }),
    dbNotify(booking.mentorUserId, "mentorship_booking_paid", {
      bookingId: booking.id,
      actorId: booking.menteeUserId,
      startsAt: booking.startsAt,
      amountCents: booking.mentorPayoutCents,
      currency: booking.currency,
    }),
  ]);
}

/**
 * Stripe finished reviewing a Connect account (or restricted it). Sync the
 * local flag so mentors do not need to revisit the payouts step for charges
 * to unlock — and so a restricted account stops taking paid bookings.
 */
async function onAccountUpdated(event: StripeEvent): Promise<void> {
  const accountId = event.data.object.id;
  if (!accountId) return;

  const mentor = await dbFindMentorByPayoutAccountId(accountId);
  if (!mentor) {
    // Not one of ours (or onboarding never stored the id). Nothing to sync.
    return;
  }

  // Prefer a live read from Stripe over the event payload — capabilities can
  // lag the boolean on the event, and retrieveAccountStatus is what GET
  // /payouts already trusts.
  try {
    const status = await getPaymentProvider().retrieveAccountStatus(accountId);
    await dbSetPayoutsEnabled(mentor.userId, status.chargesEnabled);
  } catch (error) {
    // Fall back to the event field if Stripe is briefly unreachable; still
    // better than leaving the local flag stale until the mentor clicks again.
    if (typeof event.data.object.charges_enabled === "boolean") {
      await dbSetPayoutsEnabled(mentor.userId, event.data.object.charges_enabled);
      return;
    }
    throw error;
  }
}

async function onChargeRefunded(event: StripeEvent): Promise<void> {
  const charge = event.data.object;

  /**
   * Matched on the PaymentIntent, not on metadata.
   *
   * A Charge does not inherit its PaymentIntent's metadata — they are separate
   * objects — so `brigade_booking_id` is absent here even though it was set at
   * checkout. `payment_intent` is on the charge and is written onto the booking
   * when the payment settles, so it is the handle that actually resolves.
   * Metadata is still read as a fallback, in case a refund is created by hand
   * with it set.
   */
  const booking = charge.payment_intent
    ? await dbGetBookingByPaymentIntent(charge.payment_intent)
    : charge.metadata?.brigade_booking_id
      ? await dbGetBooking(charge.metadata.brigade_booking_id)
      : null;

  if (!booking) return;

  const latest = charge.refunds?.data?.[0];
  // `amount_refunded` is the cumulative total on the charge, which is what the
  // booking column means. A single refund's amount would be wrong after a
  // second partial refund.
  const amount = Number(charge.amount_refunded ?? latest?.amount ?? 0);
  if (!amount) return;

  // Records a refund issued from the Stripe dashboard as well as one Brigade
  // asked for, so the two views of the booking cannot disagree. Returns false
  // when the amount is already recorded — a Brigade-initiated refund lands here
  // as an echo, and the mentee should not be told about it twice.
  const changed = await dbRecordRefund(booking.id, latest?.id ?? "dashboard", amount);
  if (!changed) return;

  await dbNotify(booking.menteeUserId, "mentorship_refunded", {
    bookingId: booking.id,
    amountCents: amount,
    currency: booking.currency,
  });
}
