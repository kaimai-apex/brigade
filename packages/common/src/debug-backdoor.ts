/**
 * Debug-only login bypass.
 * MUST be explicitly enabled via DEBUG_LOGIN_BACKDOOR=true.
 * Never auto-enabled based on NODE_ENV alone. Always off in production.
 */
export function isDebugBackdoorEnabled() {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DEBUG_LOGIN_BACKDOOR === 'true') {
      console.error(
        '[security] DEBUG_LOGIN_BACKDOOR=true is ignored in production. Refusing backdoor login.',
      );
    }
    return false;
  }
  return process.env.DEBUG_LOGIN_BACKDOOR === 'true';
}

export function isDebugBackdoorLogin(email: string, password: string) {
  if (!isDebugBackdoorEnabled()) return false;
  const expectedEmail = process.env.DEBUG_LOGIN_EMAIL?.trim().toLowerCase();
  const expectedPassword = process.env.DEBUG_LOGIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  return email.trim().toLowerCase() === expectedEmail && password === expectedPassword;
}
