/**
 * Prompt-shaped alias to mint a fresh Account Link when the previous one expired.
 *
 * Same handler as create-account — Stripe Account Links are single-use, so
 * "create" and "refresh" are identical server work.
 *
 * Canonical implementation: POST /api/mentorship/me/payouts
 */
export { POST } from "@/app/api/mentorship/me/payouts/route";
