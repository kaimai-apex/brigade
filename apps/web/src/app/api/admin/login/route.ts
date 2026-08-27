import { NextResponse } from "next/server";
import { isAdminPortalEmail } from "@/lib/admin/session-cookie";
import { adminPortalPasswordMatches } from "@/lib/admin/password";
import {
  ADMIN_PORTAL_COOKIE,
  ADMIN_PORTAL_TTL_SECONDS,
  signAdminPortalCookie,
} from "@/lib/admin/session-cookie";
import { normalizeJournalEmail } from "@/lib/journal/email";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { n: number; reset: number }>();

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function tooMany(ip: string): boolean {
  const now = Date.now();
  const row = attempts.get(ip);
  if (!row || row.reset <= now) {
    attempts.set(ip, { n: 1, reset: now + WINDOW_MS });
    return false;
  }
  row.n += 1;
  return row.n > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    console.error("[admin/login] JWT_SECRET is not set");
    return NextResponse.json(
      { message: "Could not sign you in. Try again in a moment." },
      { status: 500 },
    );
  }

  const ip = clientIp(request);
  if (tooMany(ip)) {
    return NextResponse.json(
      { message: "Too many tries. Wait a few minutes." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
  };
  const email = normalizeJournalEmail(body.email);
  const passwordOk = await adminPortalPasswordMatches(body.password);
  const emailOk = isAdminPortalEmail(email);

  if (!emailOk || !passwordOk) {
    return NextResponse.json(
      { message: "That login did not work." },
      { status: 401 },
    );
  }

  const token = await signAdminPortalCookie(email!, secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_PORTAL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_PORTAL_TTL_SECONDS,
  });
  return response;
}
