import { cookies } from 'next/headers';
import { verifyAccessToken } from '@connectpro/common';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type ConnectProSession = {
  userId: string;
  accessToken: string;
};

export async function getConnectProSession(): Promise<ConnectProSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('connectpro_access_token')?.value;
  if (!accessToken) return null;

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) return null;

  try {
    const payload = verifyAccessToken(accessToken, secret);
    const cookieUserId = cookieStore.get('connectpro_user_id')?.value;
    if (cookieUserId && cookieUserId !== payload.sub) {
      return null;
    }
    return { userId: payload.sub, accessToken };
  } catch {
    return null;
  }
}

export async function connectProFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = await getConnectProSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.accessToken}`,
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? res.statusText);
  }

  return data as T;
}

export async function requireConnectProSession(): Promise<ConnectProSession> {
  const session = await getConnectProSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
