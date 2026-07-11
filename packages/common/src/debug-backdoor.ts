const DEBUG_EMAIL = "administrator";
const DEBUG_PASSWORD = "Admin69$";

/** Debug-only login bypass. Enabled in dev, or when DEBUG_LOGIN_BACKDOOR=true in production. */
export function isDebugBackdoorEnabled() {
  return (
    process.env.DEBUG_LOGIN_BACKDOOR === "true" || process.env.NODE_ENV !== "production"
  );
}

export function isDebugBackdoorLogin(email: string, password: string) {
  if (!isDebugBackdoorEnabled()) return false;
  return email.trim().toLowerCase() === DEBUG_EMAIL && password === DEBUG_PASSWORD;
}

export const DEBUG_BACKDOOR_EMAIL = DEBUG_EMAIL;
export const DEBUG_BACKDOOR_PASSWORD = DEBUG_PASSWORD;
