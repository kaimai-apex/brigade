import { NextResponse } from "next/server";
import { BOOK_A_CALL } from "@/lib/book-a-call";
import {
  createPlatformCheckoutSession,
  PaymentsNotConfiguredError,
  paymentsConfigured,
} from "@/lib/server/payments";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Start Stripe Checkout for a platform-owned "Book a call" purchase.
 * No Connect destination — the charge lands on Brigade's balance.
 */
export async function POST() {
  if (!paymentsConfigured()) {
    return NextResponse.json(
      {
        message:
          "Payments are not switched on yet. Add STRIPE_SECRET_KEY to the server environment.",
      },
      { status: 503 },
    );
  }

  const site = getSiteUrl();

  try {
    const checkout = await createPlatformCheckoutSession({
      currency: BOOK_A_CALL.currency,
      priceCents: BOOK_A_CALL.priceCents,
      description: BOOK_A_CALL.description,
      kind: BOOK_A_CALL.kind,
      successUrl: `${site}/book/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${site}/book?cancelled=1`,
    });
    return NextResponse.json({ checkoutUrl: checkout.url, sessionId: checkout.sessionId });
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    console.error("[book-call]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not start checkout" },
      { status: 502 },
    );
  }
}
