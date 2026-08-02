import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbGetMentor,
  dbSetPayoutAccount,
  dbSetPayoutsEnabled,
} from "@/lib/server/mentorship-db";
import { getPaymentProvider, paymentsConfigured } from "@/lib/server/payments";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Getting the mentor paid.
 *
 * Brigade never holds the money: Stripe Connect owns the payout account, the
 * identity checks and the bank details. This route only starts Stripe's hosted
 * onboarding and reads the answer back.
 */

/** Where the mentor is sent when they finish, or when the link goes stale. */
function links() {
  const base = getSiteUrl();
  return {
    // The `payouts=return` marker is what tells the setup page to re-read the
    // account from Stripe, since landing here is not itself proof of anything.
    returnUrl: `${base}/mentorship/setup?payouts=return`,
    refreshUrl: `${base}/mentorship/setup?payouts=refresh`,
  };
}

/**
 * Current payout state, read back from Stripe rather than from our own row.
 *
 * Stripe can enable or disable an account at any time — a verification can come
 * through hours later, or an account can be restricted for missing documents.
 * Trusting the local flag would leave a mentor either unable to sell after they
 * were approved, or listed as sellable after they were restricted.
 */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const mentor = await dbGetMentor(session.userId);
  if (!mentor) {
    return NextResponse.json({ message: "You have not set up mentoring yet" }, { status: 404 });
  }

  if (!paymentsConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      payoutsEnabled: false,
      requirementsDue: [],
    });
  }

  if (!mentor.payoutAccountId) {
    return NextResponse.json({
      configured: true,
      connected: false,
      payoutsEnabled: false,
      requirementsDue: [],
    });
  }

  try {
    const status = await getPaymentProvider().retrieveAccountStatus(mentor.payoutAccountId);
    // charges_enabled is the one that decides whether they can sell: a mentee
    // cannot be charged without it. payouts_enabled can lag while Stripe
    // verifies a bank account, which does not stop them taking bookings.
    const updated = await dbSetPayoutsEnabled(session.userId, status.chargesEnabled);
    return NextResponse.json({
      configured: true,
      connected: true,
      payoutsEnabled: updated.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      bankPayoutsEnabled: status.payoutsEnabled,
      requirementsDue: status.requirementsDue,
    });
  } catch (error) {
    console.error("[mentorship/payouts GET]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { message: "Could not reach Stripe. Try again in a moment." },
      { status: 502 },
    );
  }
}

/**
 * Start or resume Stripe's hosted onboarding.
 *
 * Account links are single-use and expire in minutes, so this is called each
 * time the mentor clicks through rather than stored. The connected account id
 * IS stored, immediately — otherwise every abandoned attempt would strand a new
 * empty account on the Stripe side.
 */
export async function POST() {
  const session = await getConnectProSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (!paymentsConfigured()) {
    return NextResponse.json(
      {
        message:
          "Payments are not switched on for this deployment yet, so there is nothing to connect to.",
      },
      { status: 409 },
    );
  }

  const mentor = await dbGetMentor(session.userId);
  if (!mentor) {
    return NextResponse.json({ message: "Set up mentoring first" }, { status: 404 });
  }

  const { returnUrl, refreshUrl } = links();

  try {
    const result = await getPaymentProvider().createAccountLink({
      mentorUserId: session.userId,
      accountId: mentor.payoutAccountId,
      returnUrl,
      refreshUrl,
    });

    if (result.accountId !== mentor.payoutAccountId) {
      await dbSetPayoutAccount(session.userId, result.accountId);
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("[mentorship/payouts POST]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not start payout setup" },
      { status: 502 },
    );
  }
}
