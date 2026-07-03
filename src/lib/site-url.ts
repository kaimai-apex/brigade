/**
 * Canonical site URL for OAuth redirects.
 * Set NEXT_PUBLIC_SITE_URL in Vercel to your production domain (e.g. https://brigade.vercel.app).
 * Falls back to the current browser origin in client code.
 */
export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function authCallbackUrl(next = "/dashboard") {
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}
