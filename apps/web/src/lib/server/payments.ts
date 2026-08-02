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
  paymentIntentId: string;
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

  /** Charge the mentee, splitting the money at capture time. */
  createCheckoutSession(input: {
    bookingId: string;
    destinationAccountId: string;
    currency: string;
    priceCents: number;
    description: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;

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
  async createCheckoutSession(): Promise<never> {
    throw new PaymentsNotConfiguredError();
  }
  async cancelPaymentIntent(): Promise<void> {
    // Nothing to void — Stripe was never in the loop.
  }
}

/** Stripe's REST API speaks form encoding, including for nested keys. */
function formEncode(data: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

class StripeConnectProvider implements PaymentProvider {
  readonly configured = true;
  constructor(private readonly secretKey: string) {}

  private async call<T>(path: string, body: Record<string, string | number | undefined>): Promise<T> {
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

  async createCheckoutSession(input: {
    bookingId: string;
    destinationAccountId: string;
    currency: string;
    priceCents: number;
    description: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession> {
    // The fee is recomputed here rather than passed in, so the amount Stripe
    // keeps for Brigade always comes from the same function the booking row
    // was written with.
    const split = splitPrice(input.priceCents, PLATFORM_FEE_BPS);

    const session = await this.call<{ url: string; payment_intent: string }>("/checkout/sessions", {
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": input.currency,
      "line_items[0][price_data][unit_amount]": split.priceCents,
      "line_items[0][price_data][product_data][name]": input.description,
      "payment_intent_data[application_fee_amount]": split.platformFeeCents,
      "payment_intent_data[transfer_data][destination]": input.destinationAccountId,
      "metadata[brigade_booking_id]": input.bookingId,
      client_reference_id: input.bookingId,
    });

    return { url: session.url, paymentIntentId: session.payment_intent };
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
