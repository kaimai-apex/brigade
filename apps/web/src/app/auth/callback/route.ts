import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { namesFromMetadata } from "@/lib/profile/names";
import { oauthGoogle } from "@/lib/auth/auth-api";
import { setConnectProCookies } from "@/lib/auth/session-cookies";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

function loginErrorRedirect(origin: string, kind: "auth" | "connectpro", reason: string) {
  return NextResponse.redirect(
    `${origin}/login?error=${kind}&reason=${encodeURIComponent(reason)}`,
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;

  if (!code) {
    return loginErrorRedirect(origin, "auth", "missing_code");
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return loginErrorRedirect(origin, "auth", "supabase_not_configured");
  }

  try {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return loginErrorRedirect(origin, "auth", exchangeError.message);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return loginErrorRedirect(origin, "auth", "no_email");
    }

    const names = namesFromMetadata(user.user_metadata);
    const googleIdentity = user.identities?.find((identity) => identity.provider === "google");
    const providerUid = googleIdentity?.id ?? user.id;

    const { ok, data } = await oauthGoogle({
      email: user.email,
      provider: "google",
      providerUid,
      firstName: names.first_name ?? undefined,
      lastName: names.last_name ?? undefined,
      avatarUrl:
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : undefined,
    });

    if (!ok) {
      const reason =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
          ? data.message
          : "connectpro_oauth_failed";
      return loginErrorRedirect(origin, "connectpro", reason);
    }

    if (
      typeof data !== "object" ||
      data === null ||
      !("userId" in data) ||
      !("accessToken" in data) ||
      typeof data.userId !== "string" ||
      typeof data.accessToken !== "string"
    ) {
      return loginErrorRedirect(origin, "connectpro", "invalid_auth_response");
    }

    setConnectProCookies(response, {
      userId: data.userId,
      accessToken: data.accessToken,
      refreshToken: "refreshToken" in data && typeof data.refreshToken === "string"
        ? data.refreshToken
        : undefined,
    });

    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "callback_failed";
    console.error("[auth/callback]", error);
    return loginErrorRedirect(origin, "auth", reason);
  }
}
