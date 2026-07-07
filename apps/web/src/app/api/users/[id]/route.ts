import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function proxyWithAuth(path: string, init: RequestInit) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.headers as Record<string, string>),
    },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyWithAuth(`/api/v1/users/${id}`, { method: 'GET' });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.text();
  return proxyWithAuth(`/api/v1/users/${id}`, { method: 'PUT', body });
}
