/**
 * Client session helpers. Tokens live in httpOnly cookies only — never
 * localStorage (XSS would otherwise defeat httpOnly).
 */

export type AuthSession = {
  userId: string;
  /** Present only in-memory after login/hydrate; never persisted to localStorage. */
  accessToken?: string;
  refreshToken?: string;
};

const USER_ID_KEY = 'connectpro_user_id_hint';

export function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  // Persist only a non-secret userId hint for UI; auth is cookie-based.
  sessionStorage.setItem(USER_ID_KEY, session.userId);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem('connectpro_access_token');
  localStorage.removeItem('connectpro_refresh_token');
  localStorage.removeItem('connectpro_user_id');
  localStorage.removeItem('accessToken');
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const userId = sessionStorage.getItem(USER_ID_KEY);
  if (!userId) return null;
  return { userId };
}

export function getAccessToken(): string | null {
  // Tokens are httpOnly cookies — not readable from JS.
  return null;
}
