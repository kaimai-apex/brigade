import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { namesFromMetadata } from "@/lib/profile/names";
import { setConnectProCookies } from "@/lib/auth/session-cookies";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth&reason=missing_code`);
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")
  ) {
    return NextResponse.redirect(`${origin}/login?error=auth&reason=supabase_not_configured`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=auth&reason=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth&reason=no_email`);
  }

  const names = namesFromMetadata(user.user_metadata);
  const googleIdentity = user.identities?.find((identity) => identity.provider === "google");
  const providerUid = googleIdentity?.id ?? user.id;

  let connectProRes: Response;
  try {
    connectProRes = await fetch(`${API_BASE}/api/v1/auth/oauth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        provider: "google",
        providerUid,
        firstName: names.first_name ?? undefined,
        lastName: names.last_name ?? undefined,
        avatarUrl:
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : undefined,
      }),
    });
  } catch {
    return NextResponse.redirect(`${origin}/login?error=connectpro&reason=auth_service_unreachable`);
  }

  const data = await connectProRes.json().catch(() => ({}));
  if (!connectProRes.ok) {
    const reason =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "connectpro_oauth_failed";
    return NextResponse.redirect(
      `${origin}/login?error=connectpro&reason=${encodeURIComponent(reason)}`,
    );
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  setConnectProCookies(response, {
    userId: data.userId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return response;
}
