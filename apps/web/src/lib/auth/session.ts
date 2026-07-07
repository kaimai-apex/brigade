export const ACCESS_TOKEN_KEY = 'connectpro_access_token';
export const REFRESH_TOKEN_KEY = 'connectpro_refresh_token';
export const USER_ID_KEY = 'connectpro_user_id';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

export function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  localStorage.setItem(USER_ID_KEY, session.userId);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);
  if (!accessToken || !refreshToken || !userId) return null;
  return { accessToken, refreshToken, userId };
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}
