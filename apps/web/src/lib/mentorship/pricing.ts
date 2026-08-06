/**
 * The money. Pure functions, no I/O (except reading the fee env), so the
 * arithmetic can be tested directly and reused by the server and the booking
 * UI without drifting apart.
 *
 * Everything is integer minor units ("cents"). No floats anywhere near a price:
 * 0.1 + 0.2 !== 0.3, and a marketplace ledger is the worst place to learn that.
 */

/** Default Brigade cut when STRIPE_PLATFORM_FEE_BPS is unset. 2000 bps = 20%. */
export const DEFAULT_PLATFORM_FEE_BPS = 2000;

/**
 * Documented default / test constant. Prefer {@link getPlatformFeeBps} at
 * charge time so ops can override via env without a code change.
 */
export const PLATFORM_FEE_BPS = DEFAULT_PLATFORM_FEE_BPS;

/** Ops may set up to 50% without a deploy; higher values are ignored. */
const MAX_CONFIGURED_FEE_BPS = 5000;

const BPS_DIVISOR = 10_000;

/**
 * Platform fee in basis points for new bookings.
 *
 * Reads `STRIPE_PLATFORM_FEE_BPS` when set and valid; otherwise 20%. Invalid
 * values fall back to the default rather than taking 0% by accident.
 */
export function getPlatformFeeBps(): number {
  const raw = process.env.STRIPE_PLATFORM_FEE_BPS?.trim();
  if (!raw) return DEFAULT_PLATFORM_FEE_BPS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > MAX_CONFIGURED_FEE_BPS) {
    console.warn(
      `[pricing] ignoring invalid STRIPE_PLATFORM_FEE_BPS=${JSON.stringify(raw)}; using ${DEFAULT_PLATFORM_FEE_BPS}`,
    );
    return DEFAULT_PLATFORM_FEE_BPS;
  }
  return n;
}

export interface Split {
  priceCents: number;
  platformFeeBps: number;
  platformFeeCents: number;
  mentorPayoutCents: number;
}

/**
 * Split a price between Brigade and the mentor.
 *
 * The fee is rounded half-up and the mentor takes the remainder, so the two
 * parts always sum to exactly the price — no cent is invented or lost. The
 * database enforces the same identity as a CHECK constraint, so a rounding bug
 * here becomes a failed insert rather than a silently wrong payout.
 */
export function splitPrice(priceCents: number, feeBps = getPlatformFeeBps()): Split {
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new Error("priceCents must be a non-negative integer");
  }
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > BPS_DIVISOR) {
    throw new Error("feeBps must be an integer between 0 and 10000");
  }

  const platformFeeCents = Math.round((priceCents * feeBps) / BPS_DIVISOR);
  return {
    priceCents,
    platformFeeBps: feeBps,
    platformFeeCents,
    mentorPayoutCents: priceCents - platformFeeCents,
  };
}

/**
 * Format minor units for display.
 *
 * Intl handles the minor-unit scale per currency — JPY has none, so 1500 is
 * ¥1,500 rather than ¥15.00. Dividing by 100 unconditionally would be wrong for
 * every zero-decimal currency.
 */
export function formatMoney(cents: number, currency = "usd", locale = "en-US"): string {
  const upper = currency.toUpperCase();
  const formatter = new Intl.NumberFormat(locale, { style: "currency", currency: upper });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(cents / 10 ** digits);
}

/**
 * Cancellation policy.
 *
 * Cancel more than this far ahead and the money comes back in full; inside the
 * window it does not, because the mentor has already turned down other work for
 * that hour. A mentor cancelling always refunds in full regardless of when —
 * the person who caused the loss is the one who absorbs it.
 */
export const FREE_CANCELLATION_HOURS = 24;

export interface RefundDecision {
  refundCents: number;
  /** Shown to whoever is cancelling, before they confirm. */
  reason: string;
}

/**
 * How much comes back if this booking is cancelled now.
 *
 * Pure arithmetic over two timestamps so the number quoted in the confirmation
 * dialog and the number actually refunded come from one place. Anything already
 * refunded is subtracted, so calling this twice cannot pay out twice.
 */
export function refundForCancellation(input: {
  priceCents: number;
  refundedCents?: number;
  startsAt: Date;
  now: Date;
  cancelledBy: "mentee" | "mentor";
}): RefundDecision {
  const outstanding = input.priceCents - (input.refundedCents ?? 0);
  if (outstanding <= 0) {
    return { refundCents: 0, reason: "This booking has already been refunded." };
  }

  if (input.cancelledBy === "mentor") {
    return {
      refundCents: outstanding,
      reason: "The mentor cancelled, so the session is refunded in full.",
    };
  }

  const hoursUntil = (input.startsAt.getTime() - input.now.getTime()) / 3_600_000;
  if (hoursUntil >= FREE_CANCELLATION_HOURS) {
    return {
      refundCents: outstanding,
      reason: `Cancelled more than ${FREE_CANCELLATION_HOURS} hours ahead, so it is refunded in full.`,
    };
  }

  return {
    refundCents: 0,
    reason:
      `Cancelled within ${FREE_CANCELLATION_HOURS} hours of the session, so it is not refunded — ` +
      "the mentor has already held the time.",
  };
}

/** Guardrails on what a mentor may charge, checked before anything is stored. */
export const MIN_PRICE_CENTS = 0;
export const MAX_PRICE_CENTS = 500_000;

export function assertSellablePrice(priceCents: number): void {
  if (!Number.isInteger(priceCents)) {
    throw new Error("Price must be a whole number of cents");
  }
  if (priceCents < MIN_PRICE_CENTS || priceCents > MAX_PRICE_CENTS) {
    throw new Error(
      `Price must be between ${formatMoney(MIN_PRICE_CENTS)} and ${formatMoney(MAX_PRICE_CENTS)}`,
    );
  }
}
