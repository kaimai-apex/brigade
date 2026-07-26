import { NextResponse } from "next/server";
import { connectProDemoLogin, toAuthErrorResponse } from "@/lib/auth/connectpro-auth";
import { setConnectProCookies } from "@/lib/auth/session-cookies";
import {
  DEMO_ENTRY_PATH,
  isDemoAccessEnabled,
  isDemoPasswordValid,
} from "@/lib/auth/demo-access";

/**
 * Unlock the public demo with the shared demo password. On success the visitor
 * gets a normal session as the demo member and lands in the app.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 12;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  if (!isDemoAccessEnabled()) {
    return NextResponse.json({ message: "The demo is closed right now." }, { status: 404 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { message: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { password?: unknown };

  if (!isDemoPasswordValid(body.password)) {
    return NextResponse.json({ message: "That password isn't right." }, { status: 401 });
  }

  try {
    const tokens = await connectProDemoLogin();
    const response = NextResponse.json({ userId: tokens.userId, next: DEMO_ENTRY_PATH });
    setConnectProCookies(response, tokens);
    return response;
  } catch (error) {
    const { status, body: errBody } = toAuthErrorResponse(error, "demo");
    return NextResponse.json(errBody, { status });
  }
}
