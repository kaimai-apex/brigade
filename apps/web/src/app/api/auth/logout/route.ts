import { NextResponse } from "next/server";
import { logout } from "@/lib/auth/auth-api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.refreshToken) {
    await logout(body.refreshToken);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("connectpro_access_token");
  response.cookies.delete("connectpro_user_id");
  response.cookies.delete("connectpro_refresh_token");
  return response;
}
