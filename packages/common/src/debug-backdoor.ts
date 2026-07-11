/**
 * Debug-only login bypass.
 * MUST be explicitly enabled via DEBUG_LOGIN_BACKDOOR=true.
 * Never auto-enabled based on NODE_ENV alone.
 */
export function isDebugBackdoorEnabled() {
  return process.env.DEBUG_LOGIN_BACKDOOR === 'true';
}

export function isDebugBackdoorLogin(email: string, password: string) {
  if (!isDebugBackdoorEnabled()) return false;
  const expectedEmail = process.env.DEBUG_LOGIN_EMAIL?.trim().toLowerCase();
  const expectedPassword = process.env.DEBUG_LOGIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  return email.trim().toLowerCase() === expectedEmail && password === expectedPassword;
}

/** @deprecated Prefer env-configured credentials; kept for DTO ValidateIf only. */
export const DEBUG_BACKDOOR_EMAIL =
  process.env.DEBUG_LOGIN_EMAIL?.trim().toLowerCase() ?? '__debug_disabled__';

/** @deprecated Prefer env-configured credentials. */
export const DEBUG_BACKDOOR_PASSWORD = process.env.DEBUG_LOGIN_PASSWORD ?? '';
