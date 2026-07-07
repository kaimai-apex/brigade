import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  if (data.mfaRequired) {
    return NextResponse.json(data);
  }

  const response = NextResponse.json(data);
  response.cookies.set('connectpro_access_token', data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  response.cookies.set('connectpro_user_id', data.userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
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
