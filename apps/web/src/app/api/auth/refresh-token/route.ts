import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refresh as refreshSession } from "@/lib/auth/auth-api";

export async function POST(request: Request) {
  // The client refreshes with an empty body and relies on the httpOnly cookie,
  // so tolerate a missing/invalid JSON body instead of throwing a 500.
  let body: { refreshToken?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    body = {};
  }
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
