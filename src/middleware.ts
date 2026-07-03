import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error("Middleware failed:", error);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
    "/auth/:path*",
  ],
};
