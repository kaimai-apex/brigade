/**
 * Prompt-shaped alias for the Stripe webhook.
 *
 * Canonical implementation: POST /api/stripe/webhook
 * Prefer that URL in the Stripe Dashboard; this path exists for docs parity.
 */
export { POST } from "@/app/api/stripe/webhook/route";
