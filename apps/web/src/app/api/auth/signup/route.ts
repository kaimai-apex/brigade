import { NextResponse } from "next/server";
import { signup } from "@/lib/auth/auth-api";
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
  const { ok, status, data } = await signup(body);

  if (!ok) {
    return NextResponse.json(data, { status });
  }

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
