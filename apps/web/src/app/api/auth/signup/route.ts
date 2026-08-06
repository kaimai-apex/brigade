import { NextResponse } from "next/server";
import {
  connectProSignupPasswordless,
  isConnectProAuthConfigured,
  toAuthErrorResponse,
} from "@/lib/auth/connectpro-auth";
import { signup as passwordSignup } from "@/lib/auth/auth-api";
import { setConnectProCookies } from "@/lib/auth/session-cookies";

function isAuthTokens(
  data: unknown,
): data is { userId: string; accessToken: string; refreshToken?: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "userId" in data &&
    "accessToken" in data
  );
}

/**
 * Public signup.
 *
 * Passwordless (email + name, no password): create the account and email a
 * six-digit code. The session is issued only after verify-code — same as login.
 *
 * Password body (email + password + name): kept for the local persona/dev
 * tooling that still mints accounts with a password.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
    firstName?: unknown;
    lastName?: unknown;
  };

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { message: "That does not look like an email address." },
      { status: 400 },
    );
  }

  // Dev / persona path: password present → immediate session (unchanged).
  if (password) {
    if (!firstName || !lastName) {
      return NextResponse.json(
        { message: "First and last name are required." },
        { status: 400 },
      );
    }
    const { ok, status, data } = await passwordSignup({
      email,
      password,
      firstName,
      lastName,
    });
    if (!ok) return NextResponse.json(data, { status });
    if (!isAuthTokens(data)) {
      return NextResponse.json({ message: "Invalid auth response" }, { status: 500 });
    }
    const response = NextResponse.json({ userId: data.userId, ok: true }, { status: 201 });
    setConnectProCookies(response, {
      userId: data.userId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return response;
  }

  if (!firstName || !lastName) {
    return NextResponse.json(
      { message: "First and last name are required." },
      { status: 400 },
    );
  }

  if (!isConnectProAuthConfigured()) {
    return NextResponse.json(
      { message: "Database is not configured on the server." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  try {
    const result = await connectProSignupPasswordless({
      email,
      firstName,
      lastName,
      ip,
    });
    return NextResponse.json(
      {
        ok: true,
        mailConfigured: result.mailConfigured,
        ...(result.debugCode ? { debugCode: result.debugCode } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    const { status, body: detail } = toAuthErrorResponse(error, "signup");
    return NextResponse.json(detail, { status });
  }
}
