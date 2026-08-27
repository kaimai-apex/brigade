/**
 * Signed unlock cookie for gated resources (journal, roadmap).
 *
 * Edge-safe (Web Crypto only). The cookie value is HMAC-SHA256 of a constant
 * payload with JWT_SECRET — forging it requires the same secret that mints
 * sessions. A literal "1" is not accepted.
 *
 * Cookie name must stay in sync with JOURNAL_UNLOCK_COOKIE in email.ts.
 */
export const RESOURCE_UNLOCK_COOKIE = "brigade_journal_unlock";
export const RESOURCE_UNLOCK_PAYLOAD = "brigade-resource-unlock-v1";

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signResourceUnlock(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(RESOURCE_UNLOCK_PAYLOAD),
  );
  return bytesToHex(new Uint8Array(sig));
}

export async function isValidResourceUnlockCookie(
  value: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!value || !secret) return false;
  const expected = await signResourceUnlock(secret);
  return timingSafeEqual(value, expected);
}
