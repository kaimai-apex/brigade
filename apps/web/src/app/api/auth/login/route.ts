import { NextResponse } from "next/server";
import { login } from "@/lib/auth/auth-api";
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

export async function POST(request: Request) {
  const body = await request.json();
  const { ok, status, data } = await login(body);

  if (!ok) {
    return NextResponse.json(data, { status });
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "mfaRequired" in data &&
    data.mfaRequired
  ) {
    return NextResponse.json(data);
  }

  if (!isAuthTokens(data)) {
    return NextResponse.json({ message: "Invalid auth response" }, { status: 500 });
  }

  // Set httpOnly cookies; do not echo tokens in the JSON body.
  const response = NextResponse.json({ userId: data.userId, ok: true });
  setConnectProCookies(response, {
    userId: data.userId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return response;
}
