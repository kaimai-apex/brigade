import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isProtectedRoute =
    isOnboardingRoute || pathname.startsWith("/dashboard") || pathname.startsWith("/settings");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/signup";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/dashboard") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, onboarding_step")
      .eq("id", user.id)
      .single();

    if (profile && !profile.onboarding_completed) {
      const step = profile.onboarding_step ?? 0;
      const steps = [
        "basic-info",
        "experience",
        "education",
        "portfolio",
        "accolades",
        "availability",
        "review",
      ];
      const url = request.nextUrl.clone();
      url.pathname = `/onboarding/${steps[Math.min(step, steps.length - 1)]}`;
      return NextResponse.redirect(url);
    }

    if (profile?.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = `/profile/${user.id}`;
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthRoute && pathname.startsWith("/auth")) {
    return supabaseResponse;
  }

  return supabaseResponse;
}
