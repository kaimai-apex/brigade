import { type NextRequest, NextResponse } from "next/server";

/**
 * Access control, as an ALLOWLIST.
 *
 * This was previously a blocklist with an explicit route matcher, which meant
 * anything nobody remembered to list was public — /profile/:id, /posts/:id and
 * /hashtag/:tag among them. A blocklist fails open, and the failure is silent.
 *
 * Brigade is pre-launch: the public gets the landing page and the waitlist, and
 * nothing else. Everything else needs a session.
 */

/** Pages anyone may load. */
const PUBLIC_PAGES = new Set([
  "/",
  "/waitlist",
  // Unlisted rather than public: no link points here, and it still needs the
  // demo password. Reachable only by someone who knows both.
  "/demo",
]);

/**
 * Endpoints that must answer without a session.
 *
 * Deliberately short. Note what is absent: /api/auth/login and
 * /api/auth/signup, because there is no public sign-up while the product is
 * waitlist-only, and an open signup endpoint is how the seeding scripts worked
 * — which is exactly the hole to close.
 */
const PUBLIC_APIS = new Set([
  "/api/waitlist",
  "/api/waitlist/kit-status",
  "/api/demo/login",
  // Session plumbing: these read the caller's own cookies and are useless
  // without them, but the app calls them on every load including logged-out.
  "/api/auth/session",
  "/api/auth/logout",
  "/api/auth/refresh-token",
]);

function hasSessionCookies(request: NextRequest) {
  // Access tokens expire in ~15m; refresh tokens keep the session alive. Accept
  // either, so an expired access token does not bounce a logged-in user.
  const access = request.cookies.get("connectpro_access_token")?.value;
  const refresh = request.cookies.get("connectpro_refresh_token")?.value;
  return Boolean(access || refresh);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = hasSessionCookies(request);

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_APIS.has(pathname) || authed) return NextResponse.next({ request });
    // 404 rather than 401: an unauthenticated caller learns nothing about
    // which endpoints exist.
    return new NextResponse("Not found", { status: 404 });
  }

  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next({ request });

  if (!authed) {
    // Home, not /login. There is no public login page to send anyone to, and a
    // redirect to one would advertise that an app exists behind it.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
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
    /*
     * Everything except Next's own assets and public files. Listing routes
     * individually is what let pages slip through unprotected, so the matcher
     * now excludes rather than enumerates.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|hero/|uploads/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
