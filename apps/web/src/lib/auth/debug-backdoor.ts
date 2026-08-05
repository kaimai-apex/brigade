/**
 * The one debug helper the login path actually calls.
 *
 * Re-exported rather than imported directly so the bypass has a single,
 * greppable name inside apps/web. The gate itself lives in
 * packages/common: it hard-refuses in production and needs
 * DEBUG_LOGIN_BACKDOOR=true plus configured credentials.
 */
export { isDebugBackdoorLogin } from "@connectpro/common";
