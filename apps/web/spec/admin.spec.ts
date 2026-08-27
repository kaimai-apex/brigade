/**
 * Admin portal allowlist and signed cookie.
 *
 * Run: node --experimental-strip-types apps/web/spec/admin.spec.ts
 */
import assert from "node:assert/strict";
import { isAdminPortalEmail } from "../src/lib/admin/session-cookie.ts";
import {
  readAdminPortalCookie,
  signAdminPortalCookie,
} from "../src/lib/admin/session-cookie.ts";

assert.equal(isAdminPortalEmail("hello@joinbrigade.co"), true);
assert.equal(isAdminPortalEmail("  KaiMaiFoto@gmail.com "), true);
assert.equal(isAdminPortalEmail("jordanchanners@gmail.com"), true);
assert.equal(isAdminPortalEmail("stranger@example.com"), false);
assert.equal(isAdminPortalEmail(""), false);
assert.equal(isAdminPortalEmail(null), false);

const secret = "test-admin-secret";
const token = await signAdminPortalCookie("hello@joinbrigade.co", secret);
const session = await readAdminPortalCookie(token, secret);
assert.equal(session?.email, "hello@joinbrigade.co");
assert.equal(await readAdminPortalCookie("1", secret), null);
assert.equal(await readAdminPortalCookie(token, "other-secret"), null);
assert.equal(await readAdminPortalCookie(undefined, secret), null);

const outsider = await signAdminPortalCookie("stranger@example.com", secret);
assert.equal(await readAdminPortalCookie(outsider, secret), null);

const expired = await signAdminPortalCookie(
  "hello@joinbrigade.co",
  secret,
  Date.now() - 8 * 24 * 60 * 60 * 1000,
);
assert.equal(await readAdminPortalCookie(expired, secret), null);

console.log("admin.spec.ts: ok");
