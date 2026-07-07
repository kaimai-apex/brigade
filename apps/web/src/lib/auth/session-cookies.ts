import { NextResponse } from 'next/server';

type SessionPayload = {
  accessToken: string;
  refreshToken?: string;
  userId: string;
};

export function setConnectProCookies(response: NextResponse, data: SessionPayload) {
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
