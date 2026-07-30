/**
 * The money. Pure functions, no I/O, so the arithmetic can be tested directly
 * and reused by the server and the booking UI without drifting apart.
 *
 * Everything is integer minor units ("cents"). No floats anywhere near a price:
 * 0.1 + 0.2 !== 0.3, and a marketplace ledger is the worst place to learn that.
 */

/** Brigade's cut, in basis points. 2000 bps = 20%. */
export const PLATFORM_FEE_BPS = 2000;

const BPS_DIVISOR = 10_000;

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
export function splitPrice(priceCents: number, feeBps = PLATFORM_FEE_BPS): Split {
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
