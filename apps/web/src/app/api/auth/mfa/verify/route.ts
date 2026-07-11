import { NextResponse } from 'next/server';
import { verifyMfa } from '@/lib/auth/auth-api';
import { setConnectProCookies } from '@/lib/auth/session-cookies';

function isAuthTokens(
  data: unknown,
): data is { userId: string; accessToken: string; refreshToken?: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'userId' in data &&
    'accessToken' in data
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const mfaToken = typeof body.mfaToken === 'string' ? body.mfaToken : '';
  const code = typeof body.code === 'string' ? body.code : '';

  if (!mfaToken || !code) {
    return NextResponse.json({ message: 'mfaToken and code are required' }, { status: 400 });
  }

  const { ok, status, data } = await verifyMfa({ mfaToken, code });

  if (!ok) {
    return NextResponse.json(data, { status });
  }

  if (!isAuthTokens(data)) {
    return NextResponse.json({ message: 'Invalid auth response' }, { status: 500 });
  }

  const response = NextResponse.json({ userId: data.userId, ok: true });
  setConnectProCookies(response, {
    userId: data.userId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return response;
}
