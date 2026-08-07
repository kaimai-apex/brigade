/**
 * Default mentorship offer for the simplified Calendly publish path.
 * Re-exported from the DB layer so client code can import the shape without
 * pulling in Postgres.
 */

export const DEFAULT_MENTORSHIP_SESSION = {
  title: "Mentorship session",
  description: "One-to-one session — pick a time on Calendly after payment.",
  durationMinutes: 30,
  priceCents: 5000,
} as const;
