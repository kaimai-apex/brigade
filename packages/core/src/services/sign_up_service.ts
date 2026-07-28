import { createHash } from "node:crypto";
import { BaseService, ServiceError, type ServiceContext } from "./base_service.ts";

/**
 * Creates the User and its Profile together, in one transaction.
 *
 * They are separate tables (migration 002/003) but a person signing up needs
 * both, and a user without a profile is an unusable account. The split earns
 * its keep elsewhere — company pages and invited-but-not-accepted people are
 * profiles with no user.
 */

export type SignUpArgs = {
  ctx: ServiceContext;
  email: string;
  encryptedPassword: string;
  username: string;
  displayName: string;
  countryCode?: string | null;
  /** Explicit, separate consent. Never defaulted to true. */
  discoverable?: boolean;
};

export type SignUpResult = { userId: string; profileId: string };

/**
 * Normalises an address so gmail dot/plus variants collapse to one value, then
 * hashes it. Stored rather than compared in the clear so the blocklist
 * (canonical_email_blocks) never holds readable addresses.
 */
export function canonicalEmailHash(email: string): string {
  const [rawLocal = "", domain = ""] = email.trim().toLowerCase().split("@");
  let local = rawLocal.split("+")[0] ?? "";
  if (["gmail.com", "googlemail.com"].includes(domain)) local = local.replaceAll(".", "");
  return createHash("sha256").update(`${local}@${domain}`).digest("hex");
}

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export class SignUpService extends BaseService<SignUpArgs, SignUpResult> {
  async call({
    ctx,
    email,
    encryptedPassword,
    username,
    displayName,
    countryCode = null,
    discoverable = false,
  }: SignUpArgs): Promise<SignUpResult> {
    const { db } = ctx;
    const normalisedEmail = email.trim().toLowerCase();
    const normalisedUsername = username.trim().toLowerCase();

    if (!USERNAME_RE.test(normalisedUsername)) {
      throw new ServiceError("Invalid username", "invalid_username", 422, {
        username: ["3–30 characters, lowercase letters, numbers and underscores only"],
      });
    }

    // Reserved and impersonation-prone names (admin, hr, careers, company
    // names) are refused at signup rather than cleaned up later.
    const reserved = await db.query(
      `SELECT 1 FROM brigade.username_blocks
       WHERE (exact_match AND username = $1) OR (NOT exact_match AND $1 LIKE '%' || username || '%')
       LIMIT 1`,
      [normalisedUsername],
    );
    if (reserved.rowCount) {
      throw new ServiceError("That username is reserved", "username_reserved", 422, {
        username: ["This username is not available"],
      });
    }

    const emailHash = canonicalEmailHash(normalisedEmail);

    const banned = await db.query(
      `SELECT 1 FROM brigade.canonical_email_blocks WHERE canonical_email_hash = $1 LIMIT 1`,
      [emailHash],
    );
    if (banned.rowCount) {
      // Deliberately the same message a duplicate gets: telling a ban evader
      // which of their addresses is blocked just teaches them the next one.
      throw new ServiceError("That email cannot be used", "email_unavailable", 422);
    }

    const existing = await db.query(
      `SELECT 1 FROM brigade.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [normalisedEmail],
    );
    if (existing.rowCount) {
      throw new ServiceError("That email cannot be used", "email_unavailable", 422);
    }

    const memberRole = await db.query<{ id: string }>(
      `SELECT id::text FROM brigade.user_roles WHERE name = 'Member'`,
    );

    const user = await db.query<{ id: string }>(
      `INSERT INTO brigade.users (email, canonical_email_hash, encrypted_password, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text`,
      [normalisedEmail, emailHash, encryptedPassword, memberRole.rows[0]?.id ?? null],
    );
    const userId = user.rows[0]?.id;
    if (!userId) throw new ServiceError("Could not create the account", "signup_failed");

    const profile = await db.query<{ id: string }>(
      `INSERT INTO brigade.profiles
         (type, user_id, username, display_name, country_code, discoverable, discoverable_at, last_active_at)
       VALUES ('person', $1, $2, $3, $4, $5, CASE WHEN $5 THEN now() END, now())
       RETURNING id::text`,
      [userId, normalisedUsername, displayName, countryCode, discoverable],
    );
    const profileId = profile.rows[0]?.id;
    if (!profileId) throw new ServiceError("Could not create the profile", "signup_failed");

    await db.query(`INSERT INTO brigade.user_settings (user_id) VALUES ($1)`, [userId]);

    // A new user must never see an empty app. Seeding the feed from colleagues,
    // classmates and skill overlap is the highest-ROI work in the product:
    // day-one feed quality decides whether there is a day two.
    ctx.enqueue({
      queue: "default",
      worker: "BootstrapFeedWorker",
      args: { profileId },
    });
    ctx.enqueue({
      queue: "pull",
      worker: "ProfileCompletenessWorker",
      args: { profileId },
    });

    return { userId, profileId };
  }
}
