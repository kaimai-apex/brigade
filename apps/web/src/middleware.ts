import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/admin",
  "/feed",
  "/brigade",
  "/network",
  "/my-brigades",
  "/discover",
  "/directory",
  "/explore",
  "/opportunities",
  "/jobs",
  "/messages",
  "/search",
  "/notifications",
  "/companies",
  "/company",
  "/profile/me",
];

const SESSION_PREFIXES = [
  "/onboarding",
  "/dashboard",
  "/settings",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

function hasSessionCookies(request: NextRequest) {
  // Access tokens expire in ~15m; refresh tokens keep the session alive.
  // Allow either so expired access tokens don't bounce logged-in users to /login
  // (client + /api/connectpro proxy refresh on 401).
  const access = request.cookies.get("connectpro_access_token")?.value;
  const refresh = request.cookies.get("connectpro_refresh_token")?.value;
  return Boolean(access || refresh);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = hasSessionCookies(request);

  // Legacy dashboard → feed
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!authed) return redirectToLogin(request, "/feed");
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  // Legacy network → brigade
  if (pathname === "/network" || pathname.startsWith("/network/")) {
    if (!authed) return redirectToLogin(request, "/brigade");
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/network/, "/brigade") || "/brigade";
    return NextResponse.redirect(url);
  }

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) || matchesPrefix(pathname, SESSION_PREFIXES)) {
    if (!authed) {
      return redirectToLogin(request, pathname);
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/feed/:path*",
    "/brigade/:path*",
    "/network/:path*",
    "/connections/:path*",
    "/my-brigades/:path*",
    "/discover/:path*",
    "/directory/:path*",
    "/explore/:path*",
    "/opportunities/:path*",
    "/jobs/:path*",
    "/messages/:path*",
    "/search/:path*",
    "/notifications/:path*",
    "/companies/:path*",
    "/company/:path*",
    "/profile/me",
    "/profile/me/:path*",
  ],
};
