import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refresh as refreshSession } from "@/lib/auth/auth-api";

export async function POST(request: Request) {
  const body = await request.json();
  const cookieStore = await cookies();
  const refreshToken =
    body.refreshToken ?? cookieStore.get("connectpro_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: "Refresh token required" }, { status: 400 });
  }

  const { ok, status, data } = await refreshSession(refreshToken);
  if (!ok) {
    return NextResponse.json(data, { status });
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("accessToken" in data) ||
    typeof data.accessToken !== "string"
  ) {
    return NextResponse.json({ message: "Invalid refresh response" }, { status: 500 });
  }

  const response = NextResponse.json(data);
  response.cookies.set("connectpro_access_token", data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
  if ("refreshToken" in data && typeof data.refreshToken === "string") {
    response.cookies.set("connectpro_refresh_token", data.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}
