import { NextResponse } from "next/server";
import { signup, login } from "@/lib/auth/auth-api";
import { setConnectProCookies } from "@/lib/auth/session-cookies";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  newPersonaEmail,
  resetDevPersona,
  isDevPersonaEmail,
} from "@/lib/server/dev-personas";
import { getAuthSchema, getPool } from "@connectpro/common";

/**
 * DEV-ONLY persona switcher behind /dev.
 *
 * Creates throwaway accounts so the onboarding and become-a-mentor flows can be
 * walked repeatedly without signing in as yourself — signing in as yourself
 * means permanently converting your own profile into a mentor, which is not
 * undoable through the UI.
 *
 * Hard 404 in production, checked first in every handler. This route creates
 * users and hands out sessions; if it ever answered on the live site it would
 * be a complete authentication bypass.
 */

/** Every persona shares this, and it is never a real member's password. */
const PERSONA_PASSWORD = "PersonaDemo1234!";

function blockedInProduction(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  return null;
}

export async function POST(request: Request) {
  const blocked = blockedInProduction();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    kind?: string;
    firstName?: string;
    lastName?: string;
    userId?: string;
  };

  // ---- reset the persona currently signed in -----------------------------
  if (body.action === "reset") {
    const session = await getConnectProSession();
    if (!session) {
      return NextResponse.json({ message: "Nobody is signed in" }, { status: 400 });
    }
    const ok = await resetDevPersona(session.userId);
    if (!ok) {
      // The guard that stops this wiping a real profile.
      return NextResponse.json(
        {
          message:
            "That account is not a demo persona, so it was left alone. Create a persona first.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, next: "/mentorship/setup" });
  }

  // ---- sign back in as an existing persona -------------------------------
  if (body.action === "switch") {
    if (!body.userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }
    const who = await getPool().query(
      `SELECT email FROM ${getAuthSchema()}.users WHERE id = $1`,
      [body.userId],
    );
    const email = who.rows[0]?.email as string | undefined;
    if (!email || !isDevPersonaEmail(email)) {
      return NextResponse.json({ message: "Not a demo persona" }, { status: 400 });
    }
    const result = await login({ email, password: PERSONA_PASSWORD });
    if (!result.ok || typeof result.data !== "object" || result.data === null) {
      return NextResponse.json({ message: "Could not sign in as that persona" }, { status: 500 });
    }
    const tokens = result.data as { userId: string; accessToken: string; refreshToken?: string };
    const response = NextResponse.json({ ok: true, next: body.kind === "member" ? "/onboarding" : "/mentorship/setup" });
    setConnectProCookies(response, tokens);
    return response;
  }

  // ---- create a brand new persona and sign in as them --------------------
  const kind = body.kind === "member" ? "member" : "mentor";
  const email = newPersonaEmail(kind);
  const firstName = body.firstName?.trim() || (kind === "mentor" ? "Alex" : "Jordan");
  const lastName = body.lastName?.trim() || "Rivera";

  const created = await signup({ email, password: PERSONA_PASSWORD, firstName, lastName });
  if (
    !created.ok ||
    typeof created.data !== "object" ||
    created.data === null ||
    !("userId" in created.data) ||
    !("accessToken" in created.data)
  ) {
    return NextResponse.json(
      {
        message:
          "Could not create the persona. Is the database running and DATABASE_URL pointed at it?",
        detail: created.data,
      },
      { status: 500 },
    );
  }

  const tokens = created.data as { userId: string; accessToken: string; refreshToken?: string };
  const response = NextResponse.json({
    ok: true,
    email,
    userId: tokens.userId,
    next: kind === "member" ? "/onboarding" : "/mentorship/setup",
  });
  setConnectProCookies(response, tokens);
  return response;
}

/** Sign out of the persona without touching a real session elsewhere. */
export async function DELETE() {
  const blocked = blockedInProduction();
  if (blocked) return blocked;

  const response = NextResponse.json({ ok: true });
  for (const name of [
    "connectpro_access_token",
    "connectpro_refresh_token",
    "connectpro_user_id",
  ]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}
