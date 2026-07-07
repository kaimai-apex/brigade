import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(request: Request) {
  const body = await request.json();
  const cookieStore = await cookies();
  const refreshToken =
    body.refreshToken ?? cookieStore.get('connectpro_refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'Refresh token required' }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const response = NextResponse.json(data);
  response.cookies.set('connectpro_access_token', data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  if (data.refreshToken) {
    response.cookies.set('connectpro_refresh_token', data.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}
