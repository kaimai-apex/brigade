import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/feed",
  "/network",
  "/my-brigades",
  "/opportunities",
  "/jobs",
  "/messages",
  "/search",
  "/notifications",
  "/companies",
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("connectpro_access_token")?.value;

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) || matchesPrefix(pathname, SESSION_PREFIXES)) {
    if (!token) {
      return redirectToLogin(request, pathname);
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/feed/:path*",
    "/network/:path*",
    "/connections/:path*",
    "/my-brigades/:path*",
    "/opportunities/:path*",
    "/jobs/:path*",
    "/messages/:path*",
    "/search/:path*",
    "/notifications/:path*",
    "/companies/:path*",
  ],
};
