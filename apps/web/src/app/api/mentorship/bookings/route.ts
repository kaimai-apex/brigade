import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbCancelBooking,
  dbConfirmFreeBooking,
  dbCreateBooking,
  dbAttachCheckoutSession,
  dbGetBillingEmail,
  dbGetMentor,
  dbListBookingsForMentee,
  dbListBookingsForMentor,
  dbListSessionTypes,
  SlotUnavailableError,
  TooManyPendingBookingsError,
} from "@/lib/server/mentorship-db";
import { CHECKOUT_WINDOW_MINUTES } from "@/lib/mentorship/holds";
import { dbNotify } from "@/lib/server/notify-db";
import { getPaymentProvider, paymentsFullyConfigured } from "@/lib/server/payments";
import { getSiteUrl } from "@/lib/site-url";
import { getPool } from "@connectpro/common";

/** Both sides of the caller's calendar. */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const [booked, teaching] = await Promise.all([
      dbListBookingsForMentee(session.userId),
      dbListBookingsForMentor(session.userId),
    ]);
    return NextResponse.json({ booked, teaching });
  } catch (error) {
    console.error("[mentorship/bookings]", error instanceof Error ? error.message : error);
    return NextResponse.json({ booked: [], teaching: [] });
  }
}

async function displayName(userId: string): Promise<string | undefined> {
  const who = await getPool().query(
    "SELECT first_name, last_name FROM users.profiles WHERE user_id = $1",
    [userId],
  );
  const row = who.rows[0];
  if (!row) return undefined;
  return `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || undefined;
}

/**
 * Reserve a slot, and take the money for it.
 *
 * Three outcomes, in order of how much has to be true:
 *
 *  - A free session confirms immediately. There is no charge to wait for, and
 *    leaving it `pending_payment` would strand a session nobody owes anything on.
 *  - A paid session on a deployment with Stripe configured returns a Checkout
 *    URL. The booking stays `pending_payment` until the webhook says the money
 *    settled — an unpaid hold must never read as a promise to either party.
 *  - A paid session with no Stripe configured keeps the original behaviour: the
 *    mentor accepts by hand and settles off-platform.
 */
export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { mentorUserId, sessionTypeId, startsAt } = body;

  if (
    typeof mentorUserId !== "string" ||
    typeof sessionTypeId !== "string" ||
    typeof startsAt !== "string"
  ) {
    return NextResponse.json(
      { message: "mentorUserId, sessionTypeId and startsAt are required" },
      { status: 400 },
    );
  }

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ message: "startsAt is not a valid time" }, { status: 400 });
  }

  const payments = getPaymentProvider();
  const takingPayments = paymentsFullyConfigured();

  // Checked BEFORE the hold is created. Creating a booking and then discovering
  // it can never be paid for would block the slot for the whole hold window for
  // no reason.
  const mentor = await dbGetMentor(mentorUserId);
  const sessionType = (await dbListSessionTypes(mentorUserId)).find(
    (type) => type.id === sessionTypeId,
  );
  if (!mentor || !sessionType) {
    return NextResponse.json({ message: "That session is no longer offered" }, { status: 400 });
  }

  // Both conditions matter: the account id is where the money is sent, and
  // payouts_enabled is Stripe's word that the account may receive it. Publishing
  // is already gated on this, so reaching here means something changed on
  // Stripe's side since the mentor went live.
  if (
    takingPayments &&
    sessionType.priceCents > 0 &&
    (!mentor.payoutAccountId || !mentor.payoutsEnabled)
  ) {
    return NextResponse.json(
      {
        message:
          "This mentor has not finished setting up payouts, so this session cannot be paid for yet.",
      },
      { status: 409 },
    );
  }

  let booking;
  try {
    booking = await dbCreateBooking(session.userId, {
      mentorUserId,
      sessionTypeId,
      startsAt: start,
    });
  } catch (error) {
    // Losing the race is an ordinary outcome, not a server fault.
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof TooManyPendingBookingsError) {
      return NextResponse.json({ message: error.message }, { status: 429 });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not book" },
      { status: 400 },
    );
  }

  const actorName = await displayName(session.userId);

  // ---- Free session: nothing to charge, so confirm it now. ----------------
  if (booking.priceCents === 0) {
    const confirmed = (await dbConfirmFreeBooking(booking.id)) ?? booking;
    await dbNotify(mentorUserId, "mentorship_booking", {
      bookingId: confirmed.id,
      actorId: session.userId,
      actorName,
      startsAt: confirmed.startsAt,
    });
    return NextResponse.json({ ...confirmed, checkoutUrl: null }, { status: 201 });
  }

  // ---- Paid, and Stripe is live: send them to Checkout. -------------------
  if (takingPayments) {
    try {
      const receiptEmail = await dbGetBillingEmail(session.userId);
      const site = getSiteUrl();
      const checkout = await payments.createCheckoutSession({
        bookingId: booking.id,
        destinationAccountId: mentor.payoutAccountId!,
        currency: booking.currency,
        priceCents: booking.priceCents,
        description: sessionType.title,
        successUrl: `${site}/sessions/${booking.id}?paid=1`,
        cancelUrl: `${site}/mentors/${mentorUserId}?checkout=cancelled`,
        receiptEmail: receiptEmail ?? undefined,
        expiresAt: Math.floor(Date.now() / 1000) + CHECKOUT_WINDOW_MINUTES * 60,
      });

      await dbAttachCheckoutSession(booking.id, checkout.sessionId);

      // No notification yet, on purpose. Nothing has been paid, and telling a
      // mentor about a booking that may never be paid for trains them to ignore
      // the ones that were.
      return NextResponse.json(
        { ...booking, checkoutSessionId: checkout.sessionId, checkoutUrl: checkout.url },
        { status: 201 },
      );
    } catch (error) {
      // The hold exists but can never be paid — release it now rather than
      // leaving the mentor's calendar blocked until the reaper runs.
      await dbCancelBooking(booking.id, session.userId).catch(() => null);
      console.error(
        "[mentorship/bookings checkout]",
        error instanceof Error ? error.message : error,
      );
      return NextResponse.json(
        { message: "Could not start the payment. Nothing was charged — please try again." },
        { status: 502 },
      );
    }
  }

  // ---- Paid, but no Stripe on this deployment: the mentor accepts by hand. -
  await dbNotify(mentorUserId, "mentorship_booking", {
    bookingId: booking.id,
    actorId: session.userId,
    actorName,
    startsAt: booking.startsAt,
  });

  return NextResponse.json(
    { ...booking, checkoutUrl: null, requiresManualConfirmation: true },
    { status: 201 },
  );
}
