import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('connectpro_user_id')?.value;
  const accessToken = cookieStore.get('connectpro_access_token')?.value;
  const refreshToken = cookieStore.get('connectpro_refresh_token')?.value;

  if (!userId || !accessToken) {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({
    session: {
      userId,
      accessToken,
      refreshToken: refreshToken ?? '',
    },
  });
}
