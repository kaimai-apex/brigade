import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logout } from "@/lib/auth/auth-api";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    refreshToken?: unknown;
  };
  const jar = await cookies();
  const fromBody =
    typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";
  const fromCookie = jar.get("connectpro_refresh_token")?.value?.trim() ?? "";
  const refreshToken = fromBody || fromCookie;

  if (refreshToken) {
    await logout(refreshToken);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("connectpro_access_token");
  response.cookies.delete("connectpro_user_id");
  response.cookies.delete("connectpro_refresh_token");
  return response;
}
