/** Loose phone check: enough digits to reach someone, not a country-perfect parse. */
const PHONE_DIGITS_RE = /^\d{6,15}$/;

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, 32);
  const digits = trimmed.replace(/\D/g, "");
  if (!PHONE_DIGITS_RE.test(digits)) return null;
  return trimmed;
}
