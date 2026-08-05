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

/**
 * @param accessMaxAge Seconds the access cookie survives. Defaults to the
 * 15 minutes the token itself is signed for. The only caller that passes
 * anything else is the development login, whose token is signed to match —
 * a cookie that outlives its token is just a slower redirect to /login.
 */
export function setConnectProCookies(
  response: NextResponse,
  data: SessionPayload,
  accessMaxAge = 60 * 15,
) {
  response.cookies.set('connectpro_access_token', data.accessToken, cookieOpts(accessMaxAge));
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
