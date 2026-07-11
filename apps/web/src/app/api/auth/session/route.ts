import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@connectpro/common';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('connectpro_access_token')?.value;
  const cookieUserId = cookieStore.get('connectpro_user_id')?.value;

  if (!accessToken) {
    return NextResponse.json({ session: null });
  }

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ session: null });
  }

  try {
    const payload = verifyAccessToken(accessToken, secret);
    // Bind cookie userId to JWT sub when present; prefer JWT.
    if (cookieUserId && cookieUserId !== payload.sub) {
      return NextResponse.json({ session: null });
    }
    // Never return tokens to the browser — cookies already hold them.
    return NextResponse.json({
      session: {
        userId: payload.sub,
        authenticated: true,
      },
    });
  } catch {
    return NextResponse.json({ session: null });
  }
}
