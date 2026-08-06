import { NextResponse } from "next/server";
import {
  connectProRequestLoginCode,
  toAuthErrorResponse,
} from "@/lib/auth/connectpro-auth";

/**
 * Step one of logging in: ask for a code for an existing account.
 *
 * Unknown emails return 404 with a Sign-up nudge — login and signup are
 * distinct actions, and pretending a code was mailed when it wasn't confuses
 * people more than a membership oracle costs us.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { message: "That does not look like an email address." },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  try {
    const result = await connectProRequestLoginCode({ email, ip });
    return NextResponse.json({
      ok: true,
      mailConfigured: result.mailConfigured,
      ...(result.debugCode ? { debugCode: result.debugCode } : {}),
    });
  } catch (error) {
    const { status, body: detail } = toAuthErrorResponse(error, "login");
    return NextResponse.json(detail, { status });
  }
}
