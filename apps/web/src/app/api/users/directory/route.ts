import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function GET() {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${API_BASE}/api/v1/users/directory/list`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
