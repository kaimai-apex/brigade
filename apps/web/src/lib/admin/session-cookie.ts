/**
 * Signed admin-portal cookie. Edge-safe (Web Crypto only).
 *
 * Payload is the allowlisted email plus an expiry. Forging it requires
 * JWT_SECRET. The allowlist is checked again on every read, so removing an
 * address here drops an already-issued cookie.
 */

export const ADMIN_PORTAL_EMAILS = [
  "hello@joinbrigade.co",
  "kaimaifoto@gmail.com",
  "jordanchanners@gmail.com",
] as const;

const allowed = new Set<string>(ADMIN_PORTAL_EMAILS);

export function isAdminPortalEmail(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return allowed.has(raw.trim().toLowerCase());
}

export const ADMIN_PORTAL_COOKIE = "brigade_admin";
export const ADMIN_PORTAL_TTL_SECONDS = 60 * 60 * 24 * 7;

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
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

async function hmacHex(secret: string, message: string): Promise<string> {
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
    new TextEncoder().encode(message),
  );
  return bytesToHex(new Uint8Array(sig));
}

export async function signAdminPortalCookie(
  email: string,
  secret: string,
  nowMs = Date.now(),
): Promise<string> {
  const payload = JSON.stringify({
    e: email.trim().toLowerCase(),
    exp: Math.floor(nowMs / 1000) + ADMIN_PORTAL_TTL_SECONDS,
    p: "admin",
  });
  const body = bytesToBase64Url(new TextEncoder().encode(payload));
  const sig = await hmacHex(secret, body);
  return `${body}.${sig}`;
}

export async function readAdminPortalCookie(
  value: string | undefined,
  secret: string | undefined,
): Promise<{ email: string } | null> {
  if (!value || !secret) return null;
  const dot = value.indexOf(".");
  if (dot < 1) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!body || !sig) return null;

  const expected = await hmacHex(secret, body);
  if (!timingSafeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(body)),
    ) as { e?: unknown; exp?: unknown; p?: unknown };
    if (payload.p !== "admin") return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
      return null;
    }
    if (typeof payload.e !== "string" || !isAdminPortalEmail(payload.e)) {
      return null;
    }
    return { email: payload.e };
  } catch {
    return null;
  }
}
