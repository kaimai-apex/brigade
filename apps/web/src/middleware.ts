import { type NextRequest, NextResponse } from "next/server";

/**
 * Access control, as an ALLOWLIST.
 *
 * Public: mentorship marketplace (the landing experience), waitlist, login,
 * and the APIs those surfaces need. Everything else needs a verified session.
 */

/** Exact public pages. */
const PUBLIC_PAGES = new Set([
  "/",
  "/waitlist",
  "/login",
  "/demo",
]);

/**
 * Exact public APIs. Mentorship browse is handled by prefix below so nested
 * mentor IDs stay public while /api/mentorship/me and bookings stay private.
 */
const PUBLIC_APIS = new Set([
  "/api/waitlist",
  "/api/demo/login",
  // Stripe has no Brigade session. Its authentication is the signed
  // Stripe-Signature header, which the route verifies against the endpoint
  // secret before reading a single field of the body.
  "/api/stripe/webhook",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/auth/refresh-token",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/mfa/verify",
]);

/** Refresh tokens are 48 random bytes, hex-encoded (see connectpro-auth). */
const REFRESH_HEX = /^[0-9a-f]{96}$/i;

function base64UrlToBytes(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Copy into a fresh ArrayBuffer so Web Crypto's BufferSource typing accepts it. */
function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Edge-safe HS256 verify (jsonwebtoken is Node-only). Rejects MFA-challenge
 * tokens and expired access tokens so a forged cookie cannot pass the gate.
 */
async function accessTokenIsValid(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]))) as {
      alg?: string;
    };
    if (header.alg !== "HS256") return false;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      asBufferSource(base64UrlToBytes(parts[2])),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!ok) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as {
      sub?: string;
      exp?: number;
      purpose?: string;
    };
    if (payload.purpose === "mfa") return false;
    if (typeof payload.sub !== "string" || !payload.sub) return false;
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

async function hasVerifiedSession(request: NextRequest): Promise<boolean> {
  const secret = process.env.JWT_SECRET?.trim();
  const access = request.cookies.get("connectpro_access_token")?.value;
  const refresh = request.cookies.get("connectpro_refresh_token")?.value;

  if (secret && access && (await accessTokenIsValid(access, secret))) {
    return true;
  }
  if (refresh && REFRESH_HEX.test(refresh)) {
    return true;
  }
  return false;
}

function isPublicPage(pathname: string): boolean {
  if (PUBLIC_PAGES.has(pathname)) return true;
  // Exact segment match — do not treat /mentorship as /mentors*.
  if (pathname === "/mentors" || pathname.startsWith("/mentors/")) return true;
  if (pathname.startsWith("/login/")) return true;
  return false;
}

function isPublicApi(pathname: string): boolean {
  if (PUBLIC_APIS.has(pathname)) return true;
  // List + /:id only — not /api/mentorship/me or bookings.
  if (
    pathname === "/api/mentorship/mentors" ||
    pathname.startsWith("/api/mentorship/mentors/")
  ) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await hasVerifiedSession(request);

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname) || authed) return NextResponse.next({ request });
    return new NextResponse("Not found", { status: 404 });
  }

  if (isPublicPage(pathname)) return NextResponse.next({ request });

  if (!authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Legacy paths, for sessions that still hold old links.
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }
  if (pathname === "/network" || pathname.startsWith("/network/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/network/, "/brigade") || "/brigade";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|hero/|uploads/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
