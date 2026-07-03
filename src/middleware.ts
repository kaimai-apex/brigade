import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_ROUTE_PREFIXES = [
  "/onboarding",
  "/dashboard",
  "/settings",
  "/login",
  "/signup",
  "/auth",
];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Supabase may redirect to Site URL root with ?code= if callback URL isn't allowlisted
  if (pathname === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!searchParams.has("next")) {
      url.searchParams.set("next", "/onboarding/basic-info");
    }
    return NextResponse.redirect(url);
  }

  if (!isAuthRoute(pathname)) {
    return NextResponse.next({ request });
  }

  try {
    return await updateSession(request);
  } catch (error) {
    console.error("Middleware failed:", error);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/",
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
    "/auth/:path*",
  ],
};
