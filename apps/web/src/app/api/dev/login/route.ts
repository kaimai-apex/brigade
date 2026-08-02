import { NextResponse } from 'next/server';
import { login } from '@/lib/auth/auth-api';
import { setConnectProCookies } from '@/lib/auth/session-cookies';

/**
 * DEV-ONLY shortcut: log in as a seeded demo member and jump straight into the app,
 * bypassing the waitlist/login screens. Never available in production.
 *
 * Credentials must come from DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD — no hardcoded
 * password fallback. Visit /api/dev/login?next=/directory.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const email = process.env.DEMO_LOGIN_EMAIL?.trim();
  const password = process.env.DEMO_LOGIN_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      {
        message:
          'Set DEMO_LOGIN_EMAIL and DEMO_LOGIN_PASSWORD in .env to use /api/dev/login',
      },
      { status: 503 },
    );
  }

  const nextParam = new URL(request.url).searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/directory';

  const { ok, data } = await login({ email, password });

  if (
    !ok ||
    typeof data !== 'object' ||
    data === null ||
    !('userId' in data) ||
    !('accessToken' in data)
  ) {
    const msg = encodeURIComponent(
      'Demo login failed — is the backend stack running and the demo user seeded?',
    );
    return NextResponse.redirect(new URL(`/login?error=${msg}`, request.url));
  }

  const tokens = data as {
    userId: string;
    accessToken: string;
    refreshToken?: string;
  };
  const response = NextResponse.redirect(new URL(next, request.url));
  setConnectProCookies(response, {
    userId: tokens.userId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
  return response;
}
