import { BaseService, NotFoundError, type ServiceContext } from "./base_service.ts";

/**
 * The services behind the workers that used to be placeholders: search
 * indexing, session revocation, and erasure.
 */

/* ------------------------------------------------------------------ */
/* Search indexing                                                     */
/* ------------------------------------------------------------------ */

/**
 * Rebuild a profile's search document.
 *
 * The trigger on brigade.profiles (migration 012) only sees that table's own
 * columns, so a profile becomes stale in search the moment its experiences,
 * skills or education change — which is most of what people actually search
 * for. This pulls the related rows in and rewrites the vector.
 *
 * Async on purpose. Indexing inside the request would make every profile edit
 * pay for a join, and a burst of edits would index the same row repeatedly.
 */
export class IndexProfileService extends BaseService<
  { ctx: ServiceContext; profileId: string },
  { indexed: boolean }
> {
  async call({ ctx, profileId }: { ctx: ServiceContext; profileId: string }) {
    const result = await ctx.db.query(
      `UPDATE brigade.profiles p SET search_vector =
           setweight(to_tsvector('simple', unaccent(coalesce(p.display_name, ''))), 'A')
         || setweight(to_tsvector('simple', unaccent(coalesce(p.username, ''))), 'A')
         || setweight(to_tsvector('simple', unaccent(coalesce(p.headline, ''))), 'B')
         -- Employers and titles: "who worked at Acme" is a search, not a filter.
         || setweight(to_tsvector('simple', unaccent(coalesce((
              SELECT string_agg(DISTINCT e.company_name || ' ' || e.title, ' ')
              FROM brigade.experiences e WHERE e.profile_id = p.id
            ), ''))), 'B')
         || setweight(to_tsvector('simple', unaccent(coalesce((
              SELECT string_agg(DISTINCT s.name, ' ')
              FROM brigade.profile_skills ps
              JOIN brigade.skills s ON s.id = ps.skill_id
              WHERE ps.profile_id = p.id
            ), ''))), 'B')
         || setweight(to_tsvector('simple', unaccent(coalesce((
              SELECT string_agg(DISTINCT ed.institution_name, ' ')
              FROM brigade.educations ed WHERE ed.profile_id = p.id
            ), ''))), 'C')
         || setweight(to_tsvector('simple', unaccent(coalesce(p.city, ''))), 'C')
         || setweight(to_tsvector('simple', unaccent(coalesce(p.bio, ''))), 'D')
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [profileId],
    );
    return { indexed: (result.rowCount ?? 0) > 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Session revocation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Drop every active session for a profile's user.
 *
 * Without this a suspension is advisory until the access token expires, which
 * is exactly the window a suspended account would use. Called by the
 * enforcement service, and safe to run against an account with no user (a
 * company page) — it simply matches nothing.
 */
export class RevokeSessionsService extends BaseService<
  { ctx: ServiceContext; profileId: string },
  { revoked: number }
> {
  async call({ ctx, profileId }: { ctx: ServiceContext; profileId: string }) {
    const result = await ctx.db.query(
      `DELETE FROM brigade.session_activations sa
       USING brigade.profiles p
       WHERE p.id = $1 AND sa.user_id = p.user_id`,
      [profileId],
    );
    return { revoked: result.rowCount ?? 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Erasure                                                             */
/* ------------------------------------------------------------------ */

/**
 * Erase a profile's personal data, keeping the minimum needed to stop the
 * account being recreated and to answer questions about why it was removed.
 *
 * GDPR Art. 17 is a right to erasure, not a right to make a moderation record
 * disappear — so this scrubs personal data and content while leaving the
 * tombstone row, the moderation log (append-only anyway) and the canonical
 * email hash that enforces a ban.
 *
 * Deliberately not a hard DELETE of the profile row: half the graph references
 * it, and cascading would silently rewrite other people's connection counts and
 * conversation history.
 */
export class PurgeProfileService extends BaseService<
  { ctx: ServiceContext; profileId: string },
  { purged: boolean; postsRemoved: number }
> {
  async call({ ctx, profileId }: { ctx: ServiceContext; profileId: string }) {
    const { db } = ctx;

    const exists = await db.query<{ user_id: string | null }>(
      `SELECT user_id::text FROM brigade.profiles WHERE id = $1`,
      [profileId],
    );
    const row = exists.rows[0];
    if (!row) throw new NotFoundError("Profile not found");

    const posts = await db.query(
      `UPDATE brigade.posts SET text = '', deleted_at = coalesce(deleted_at, now())
       WHERE profile_id = $1`,
      [profileId],
    );

    // Structured profile content is personal data in full.
    for (const table of [
      "experiences",
      "educations",
      "certifications",
      "projects",
      "publications",
      "profile_languages",
      "profile_skills",
      "profile_fields",
      "profile_links",
      "profile_notes",
    ]) {
      await db.query(`DELETE FROM brigade.${table} WHERE profile_id = $1`, [profileId]);
    }

    await db.query(
      `UPDATE brigade.profiles SET
         display_name = 'Deleted member', headline = NULL, bio = NULL,
         avatar_url = NULL, header_url = NULL, avatar_blurhash = NULL, header_blurhash = NULL,
         city = NULL, region = NULL, country_code = NULL, search_vector = NULL,
         discoverable = false, deleted_at = coalesce(deleted_at, now()),
         -- The username is released for reuse but replaced with something that
         -- cannot collide with a real one.
         username = 'deleted_' || id::text
       WHERE id = $1`,
      [profileId],
    );

    if (row.user_id) {
      // canonical_email_hash is kept: it is what stops a banned account being
      // recreated from the same mailbox, and it is a hash, not an address.
      await db.query(
        `UPDATE brigade.users SET
           email = 'deleted+' || id::text || '@invalid',
           encrypted_password = NULL, otp_secret = NULL, otp_backup_codes = NULL,
           current_sign_in_ip = NULL, last_sign_in_ip = NULL,
           deleted_at = coalesce(deleted_at, now())
         WHERE id = $1`,
        [row.user_id],
      );
      await db.query(`DELETE FROM brigade.user_ips WHERE user_id = $1`, [row.user_id]);
      await db.query(`DELETE FROM brigade.session_activations WHERE user_id = $1`, [row.user_id]);
      await db.query(`DELETE FROM brigade.identities WHERE user_id = $1`, [row.user_id]);
    }

    return { purged: true, postsRemoved: posts.rowCount ?? 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Outbound email                                                      */
/* ------------------------------------------------------------------ */

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Email transport, injected.
 *
 * No provider is chosen yet, so the default writes to the log rather than
 * pretending to send. That is the honest failure mode: a verification email
 * that silently vanishes looks identical to one that was never triggered, and
 * this way the payload is at least visible in dev and in the logs.
 */
export type EmailTransport = (email: OutboundEmail) => Promise<void>;

export const logOnlyTransport: EmailTransport = async (email) => {
  console.warn(
    "[email] no transport configured — not sent. Set one in the worker registry.",
    { to: email.to, subject: email.subject },
  );
};
