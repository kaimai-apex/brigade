/**
 * Simple platform product: a 30-minute call, paid to Brigade's Stripe account.
 * Not a Connect marketplace split — Connect can come later for mentors.
 */

export const BOOK_A_CALL = {
  kind: "book_call",
  title: "30-minute call",
  description: "Book a 30-minute call",
  durationMinutes: 30,
  /** CA$20.00 */
  priceCents: 2000,
  currency: "cad",
} as const;
