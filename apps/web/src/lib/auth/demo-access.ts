import { timingSafeEqual } from "crypto";

/**
 * Shared-password gate for the public demo. Anyone with the password can enter
 * the app as the demo member (see connectProDemoLogin) without a real account.
 *
 * Override the password with DEMO_PASSWORD; set DEMO_ACCESS_ENABLED=false to
 * close the gate entirely.
 */

export const DEMO_ACCOUNT_EMAIL = (
  process.env.DEMO_ACCOUNT_EMAIL ?? "demo@joinbrigade.co"
)
  .trim()
  .toLowerCase();

/** Where a visitor lands after unlocking the demo. */
export const DEMO_ENTRY_PATH = "/directory";

function demoPassword() {
  return (process.env.DEMO_PASSWORD ?? "joinbrigade").trim();
}

export function isDemoAccessEnabled() {
  return process.env.DEMO_ACCESS_ENABLED !== "false" && demoPassword().length > 0;
}

export function isDemoPasswordValid(input: unknown) {
  if (typeof input !== "string") return false;

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
