import { splitPrice, PLATFORM_FEE_BPS } from "@/lib/mentorship/pricing";

/**
 * Payment seam for the mentorship marketplace.
 *
 * Brigade takes a cut of a payment between two other parties, which is exactly
 * what Stripe Connect's destination charges are for: the mentee is charged, the
 * `application_fee_amount` stays with the platform, and the remainder settles
 * to the mentor's connected account. Stripe holds the money and the KYC, so
 * Brigade never touches card details or becomes a money transmitter.
 *
 * IMPORTANT: there is no fallback that pretends. If Stripe is not configured,
 * `getPaymentProvider()` returns a provider that throws on every call, so a
 * booking cannot reach `confirmed` without a real charge behind it. A stub that
 * silently "succeeded" would show mentors sessions they will never be paid for.
 */

const STRIPE_API = "https://api.stripe.com/v1";

export interface CheckoutSession {
  /** Where to send the mentee to pay. */
  url: string;
  /**
   * The Checkout Session id.
   *
   * This, not the PaymentIntent, is what correlates a later webhook back to a
   * booking: a Session has no PaymentIntent until the customer actually starts
   * paying, so reading `payment_intent` at creation time yields null.
   */
  sessionId: string;
}

/** What Stripe says about a mentor's connected account right now. */
export interface PayoutAccountStatus {
  /** True when the account can accept charges — the condition for selling. */
  chargesEnabled: boolean;
  /** True when Stripe will actually send money out to their bank. */
  payoutsEnabled: boolean;
  /** They finished the hosted form. Enablement can still be pending review. */
  detailsSubmitted: boolean;
  /** Stripe's own words on what is still outstanding, if anything. */
  requirementsDue: string[];
}

export interface RefundResult {
  refundId: string;
  amountCents: number;
}

export interface PaymentProvider {
  readonly configured: boolean;
  /**
   * Start onboarding for a mentor's payout account. Until Stripe reports the
   * account can accept charges, the mentor cannot publish paid sessions.
   */
  createAccountLink(input: {
    mentorUserId: string;
    accountId: string | null;
    returnUrl: string;
    refreshUrl: string;
  }): Promise<{ accountId: string; url: string }>;

  /**
   * Ask Stripe whether this account can trade yet.
   *
   * Returning from the hosted onboarding form does not mean the account is
   * live — Stripe may still be verifying. The only honest source for
   * `payouts_enabled` is Stripe itself, so it is read back rather than assumed
   * from the fact that the mentor came back to the return URL.
   */
  retrieveAccountStatus(accountId: string): Promise<PayoutAccountStatus>;

  /** Charge the mentee, splitting the money at capture time. */
  createCheckoutSession(input: {
    bookingId: string;
    destinationAccountId: string;
    currency: string;
    priceCents: number;
    description: string;
    successUrl: string;
    cancelUrl: string;
    /** Stripe emails its own payment receipt here once the charge settles. */
    receiptEmail?: string;
    /** Unix seconds. Matches the unpaid-hold window so the two cannot disagree. */
    expiresAt?: number;
  }): Promise<CheckoutSession>;

  /**
   * Give money back for a settled charge.
   *
   * These are destination charges, so the money is already on its way to the
   * mentor's account. Both reversals are required: `reverse_transfer` pulls the
   * mentor's share back, `refund_application_fee` returns Brigade's cut. Omit
   * either and the platform silently funds the refund out of its own balance.
   */
  refundCharge(input: {
    paymentIntentId: string;
    amountCents: number;
    reason: "requested_by_customer" | "duplicate";
  }): Promise<RefundResult>;

  /**
   * Best-effort cancel of an unpaid PaymentIntent when a booking is cancelled.
   * No-op when payments are unconfigured or the intent is already settled.
   */
  cancelPaymentIntent(paymentIntentId: string): Promise<void>;
}

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super(
      "Payments are not configured. Set STRIPE_SECRET_KEY to take bookings — " +
        "until then sessions can be listed but not paid for.",
    );
    this.name = "PaymentsNotConfiguredError";
  }
}

/**
 * What runs when there are no credentials.
 *
 * Every method throws. That is the point: the alternative is a booking that
 * looks confirmed to both people and settles to nobody.
 */
class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly configured = false;
  async createAccountLink(): Promise<never> {
    throw new PaymentsNotConfiguredError();
  }
  async retrieveAccountStatus(): Promise<never> {
    throw new PaymentsNotConfiguredError();
  }
  async createCheckoutSession(): Promise<never> {
    throw new PaymentsNotConfiguredError();
  }
  async refundCharge(): Promise<never> {
    throw new PaymentsNotConfiguredError();
  }
  async cancelPaymentIntent(): Promise<void> {
    // Nothing to void — Stripe was never in the loop.
  }
}

/** Stripe's REST API speaks form encoding, including for nested keys. */
function formEncode(data: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

class StripeConnectProvider implements PaymentProvider {
  readonly configured = true;
  constructor(private readonly secretKey: string) {}

  private async call<T>(
    path: string,
    body: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const res = await fetch(`${STRIPE_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formEncode(body),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      // Stripe's message is safe to surface; it is written for the integrator.
      throw new Error(json.error?.message ?? `Stripe request failed (${res.status})`);
    }
    return json as T;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${STRIPE_API}${path}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Stripe request failed (${res.status})`);
    }
    return json as T;
  }

  async createAccountLink(input: {
    mentorUserId: string;
    accountId: string | null;
    returnUrl: string;
    refreshUrl: string;
  }) {
    let accountId = input.accountId;
    if (!accountId) {
      const account = await this.call<{ id: string }>("/accounts", {
        type: "express",
        "capabilities[transfers][requested]": "true",
        "metadata[brigade_user_id]": input.mentorUserId,
      });
      accountId = account.id;
    }
    const link = await this.call<{ url: string }>("/account_links", {
      account: accountId,
      type: "account_onboarding",
      return_url: input.returnUrl,
      refresh_url: input.refreshUrl,
    });
    return { accountId, url: link.url };
  }

  async retrieveAccountStatus(accountId: string): Promise<PayoutAccountStatus> {
    const account = await this.get<{
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      details_submitted?: boolean;
      requirements?: { currently_due?: string[]; past_due?: string[] };
    }>(`/accounts/${encodeURIComponent(accountId)}`);

    return {
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      requirementsDue: [
        ...(account.requirements?.currently_due ?? []),
        ...(account.requirements?.past_due ?? []),
      ],
    };
  }

  async createCheckoutSession(input: {
    bookingId: string;
    destinationAccountId: string;
    currency: string;
    priceCents: number;
    description: string;
    successUrl: string;
    cancelUrl: string;
    receiptEmail?: string;
    expiresAt?: number;
  }): Promise<CheckoutSession> {
    // The fee is recomputed here rather than passed in, so the amount Stripe
    // keeps for Brigade always comes from the same function the booking row
    // was written with.
    const split = splitPrice(input.priceCents, PLATFORM_FEE_BPS);

    const session = await this.call<{ id: string; url: string }>("/checkout/sessions", {
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": input.currency,
      "line_items[0][price_data][unit_amount]": split.priceCents,
      "line_items[0][price_data][product_data][name]": input.description,
      "payment_intent_data[application_fee_amount]": split.platformFeeCents,
      "payment_intent_data[transfer_data][destination]": input.destinationAccountId,
      // Stripe sends the payment receipt itself. Brigade never sees a card
      // number, so Stripe is also the only party that can honestly describe
      // what was charged.
      "payment_intent_data[receipt_email]": input.receiptEmail,
      "metadata[brigade_booking_id]": input.bookingId,
      "payment_intent_data[metadata][brigade_booking_id]": input.bookingId,
      expires_at: input.expiresAt,
      client_reference_id: input.bookingId,
    });

    return { url: session.url, sessionId: session.id };
  }

  async refundCharge(input: {
    paymentIntentId: string;
    amountCents: number;
    reason: "requested_by_customer" | "duplicate";
  }): Promise<RefundResult> {
    const refund = await this.call<{ id: string; amount: number }>("/refunds", {
      payment_intent: input.paymentIntentId,
      amount: input.amountCents,
      reason: input.reason,
      // Destination charge: the mentor's share has already been transferred out
      // and Brigade's fee already taken. Both have to come back, or the refund
      // is paid out of the platform's own balance.
      reverse_transfer: true,
      refund_application_fee: true,
    });
    return { refundId: refund.id, amountCents: Number(refund.amount) };
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    const id = paymentIntentId.trim();
    if (!id || !/^pi_[A-Za-z0-9]+$/.test(id)) return;
    try {
      await this.call(`/payment_intents/${encodeURIComponent(id)}/cancel`, {});
    } catch {
      // Already cancelled/captured — cancellation still stands on our side.
    }
  }
}

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  cached = key ? new StripeConnectProvider(key) : new UnconfiguredPaymentProvider();
  return cached;
}

/** True when the marketplace can actually take money. */
export function paymentsConfigured(): boolean {
  return getPaymentProvider().configured;
}

/**
 * The signing secret for the webhook endpoint (`whsec_…`).
 *
 * Separate from the API key on purpose. The API key proves Brigade is talking
 * to Stripe; this proves Stripe is talking to Brigade. Without it the webhook
 * route is an unauthenticated endpoint that confirms paid bookings, so it
 * refuses to run at all rather than trusting the request.
 */
export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

/**
 * Payments are only really "on" when money can both arrive and be confirmed.
 *
 * A secret key without a webhook secret would take payments and never mark a
 * booking confirmed — the mentee is charged and nobody is told. The rest of the
 * app treats that combination as payments-off, which keeps the existing
 * manual-confirmation path available instead of stranding the session.
 */
export function paymentsFullyConfigured(): boolean {
  return paymentsConfigured() && getWebhookSecret() !== null;
}
