import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.refreshToken) {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: body.refreshToken }),
    }).catch(() => null);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('connectpro_access_token');
  response.cookies.delete('connectpro_user_id');
  response.cookies.delete('connectpro_refresh_token');
  return response;
}
