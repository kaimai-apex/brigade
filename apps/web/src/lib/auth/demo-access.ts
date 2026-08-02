import { timingSafeEqual } from "crypto";

/**
 * Shared-password gate for the public demo. Anyone with the password can enter
 * the app as the demo member (see connectProDemoLogin) without a real account.
 *
 * Fail-closed:
 * - DEMO_PASSWORD must be set explicitly (no default "joinbrigade").
 * - In production, DEMO_ACCESS_ENABLED must be "true" or the gate stays shut.
 */

export const DEMO_ACCOUNT_EMAIL = (
  process.env.DEMO_ACCOUNT_EMAIL ?? "demo@joinbrigade.co"
)
  .trim()
  .toLowerCase();

/** Where a visitor lands after unlocking the demo. */
export const DEMO_ENTRY_PATH = "/directory";

function demoPassword() {
  return (process.env.DEMO_PASSWORD ?? "").trim();
}

export function isDemoAccessEnabled() {
  if (process.env.NODE_ENV === "production" && process.env.DEMO_ACCESS_ENABLED !== "true") {
    return false;
  }
  return process.env.DEMO_ACCESS_ENABLED !== "false" && demoPassword().length >= 8;
}

export function isDemoPasswordValid(input: unknown) {
  if (typeof input !== "string") return false;
  if (!isDemoAccessEnabled()) return false;

  const expected = Buffer.from(demoPassword());
  const given = Buffer.from(input.trim());
  // timingSafeEqual throws on a length mismatch, which itself leaks length —
  // compare against a padded copy so every attempt costs the same.
  if (given.length !== expected.length) {
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(expected, given);
}
