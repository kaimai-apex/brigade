import { NextResponse } from "next/server";
import {
  connectProVerifyLoginCode,
  toAuthErrorResponse,
} from "@/lib/auth/connectpro-auth";
import { setConnectProCookies } from "@/lib/auth/session-cookies";

/**
 * Step two: the code becomes a session.
 *
 * Tokens go into httpOnly cookies and are never echoed in the body, same as
 * the password login it replaces — a token in a JSON response is a token in
 * anything that logs responses.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    code?: unknown;
  };
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";

  if (!email || code.length !== 6) {
    return NextResponse.json(
      { message: "That code is not right, or it has expired." },
      { status: 400 },
    );
  }

  try {
    const tokens = await connectProVerifyLoginCode({ email, code });
    const response = NextResponse.json({ ok: true, userId: tokens.userId });
    setConnectProCookies(response, {
      userId: tokens.userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return response;
  } catch (error) {
    const { status, body: detail } = toAuthErrorResponse(error, "verify-code");
    return NextResponse.json(detail, { status });
  }
}
