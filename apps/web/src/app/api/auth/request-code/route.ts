import { NextResponse } from "next/server";
import {
  connectProRequestLoginCode,
  toAuthErrorResponse,
} from "@/lib/auth/connectpro-auth";

/**
 * Step one of logging in: ask for a code.
 *
 * Answers identically whether or not the address has an account. Anything else
 * makes this a membership oracle — point a list of email addresses at it and
 * the different responses tell you who is a Brigade member, and the members are
 * named professionals whose employment is their business.
 *
 * The rate limit is the one thing that does answer differently, because a
 * caller hitting it already knows they are hitting it.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim() : "";

  // Shape only. Whether it exists is not this endpoint's business to reveal.
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
      // Whether Resend is wired — never whether this address has an account.
      mailConfigured: result.mailConfigured,
      // Development convenience only — connectProRequestLoginCode returns this
      // exclusively when there is no mail provider and NODE_ENV is not
      // production. It is never present in a deployed response.
      ...(result.debugCode ? { debugCode: result.debugCode } : {}),
    });
  } catch (error) {
    const { status, body: detail } = toAuthErrorResponse(error, "request-code");
    // A send failure is ours, not theirs, and saying "no account" here would
    // leak the thing the success path is careful not to.
    return NextResponse.json(detail, { status });
  }
}
