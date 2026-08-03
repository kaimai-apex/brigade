import { cookies } from 'next/headers';
import { verifyAccessToken } from '@connectpro/common';


export type ConnectProSession = {
  userId: string;
  accessToken: string;
  /** From the JWT, so it cannot be forged without the signing secret. */
  roles: string[];
};

/** Matches the roles analytics-service's admin controller accepts. */
const ADMIN_ROLES = ['SYSTEM_ADMIN', 'MODERATOR'];

export function isAdmin(session: ConnectProSession | null): boolean {
  return Boolean(session?.roles.some((role) => ADMIN_ROLES.includes(role)));
}

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
    return {
      userId: payload.sub,
      accessToken,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
  } catch {
    return null;
  }
}


export async function requireConnectProSession(): Promise<ConnectProSession> {
  const session = await getConnectProSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
