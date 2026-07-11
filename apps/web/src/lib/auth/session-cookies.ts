import { NextResponse } from 'next/server';

type SessionPayload = {
  accessToken: string;
  refreshToken?: string;
  userId: string;
};

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function setConnectProCookies(response: NextResponse, data: SessionPayload) {
  response.cookies.set('connectpro_access_token', data.accessToken, cookieOpts(60 * 15));
  response.cookies.set('connectpro_user_id', data.userId, cookieOpts(60 * 60 * 24 * 7));
  if (data.refreshToken) {
    response.cookies.set(
      'connectpro_refresh_token',
      data.refreshToken,
      cookieOpts(60 * 60 * 24 * 7),
    );
  }
  return response;
}
