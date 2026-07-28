import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { BaseService, NotFoundError, ServiceError, type ServiceContext } from "./base_service.ts";

/**
 * Employment verification — the differentiator.
 *
 * Everything else in a professional network is a commodity. "This person
 * actually works where they say they work" is not, and the mechanism is
 * borrowed from rel="me" link verification: prove control of something only
 * the real employee or employer could control.
 *
 *   Tier 1  corporate email round-trip     medium trust, trivial cost
 *   Tier 2  rel="me" backlink from a       high trust,   trivial cost
 *           company staff page
 *   Tier 3  domain-verified company admin  highest,      needs company adoption
 *   Tier 4  payroll/HR API                 highest,      paid
 *
 * Tiers 1 and 2 are built here. They cost almost nothing and immediately
 * support a badge that platforms accepting any self-reported employer cannot
 * match. Tier 3 is the growth loop — an employer claims their page to verify
 * staff, which pulls the employer onto the platform.
 *
 * Two things that are easy to get wrong and are handled here:
 *
 *   * Free webmail is not a corporate domain. Without the blocklist, anyone
 *     verifies at "gmail.com" and the badge means nothing.
 *   * Verification EXPIRES. Someone verified at Acme in 2024 may have left.
 *     Current roles carry an expiry and are re-checked; past roles are marked
 *     verified-as-of a date rather than verified forever.
 */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const CURRENT_ROLE_VALIDITY_MS = 180 * 24 * 60 * 60 * 1000; // re-verify every 6 months
const MAX_ATTEMPTS = 5;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Injected so verification is testable without reaching the network. */
export type PageFetcher = (url: string) => Promise<{ status: number; body: string; finalUrl: string }>;

export const defaultFetcher: PageFetcher = async (url) => {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "BrigadeVerifier/1.0 (+https://joinbrigade.co/verification)" },
    signal: AbortSignal.timeout(10_000),
  });
  return {
    status: response.status,
    body: (await response.text()).slice(0, 512 * 1024),
    finalUrl: response.url,
  };
};

/* ------------------------------------------------------------------ */
/* Tier 1 — corporate email round-trip                                 */
/* ------------------------------------------------------------------ */

export type StartEmailVerificationArgs = {
  ctx: ServiceContext;
  experienceId: string;
  actorProfileId: string;
  workEmail: string;
};

export type StartEmailVerificationResult = {
  verificationId: string;
  /** Returned so the mailer job can send it. Never persisted in the clear. */
  token: string;
  expiresAt: Date;
};

export class StartEmploymentEmailVerificationService extends BaseService<
  StartEmailVerificationArgs,
  StartEmailVerificationResult
> {
  async call({ ctx, experienceId, actorProfileId, workEmail }: StartEmailVerificationArgs) {
    const { db } = ctx;
    const email = workEmail.trim().toLowerCase();
    const domain = email.split("@")[1];

    if (!domain || !email.includes("@")) {
      throw new ServiceError("That is not a valid email address", "invalid_email", 422);
    }

    const experience = await db.query<{ id: string; profile_id: string; company_domain: string | null }>(
      `SELECT e.id::text, e.profile_id::text, c.domain::text AS company_domain
       FROM brigade.experiences e
       LEFT JOIN brigade.companies c ON c.id = e.company_id
       WHERE e.id = $1`,
      [experienceId],
    );
    const row = experience.rows[0];
    if (!row) throw new NotFoundError("Experience not found");
    if (row.profile_id !== actorProfileId) {
      throw new ServiceError("You can only verify your own roles", "forbidden", 403);
    }

    // Free webmail and disposable providers are not employers. Without this the
    // badge is decorative.
    const blocked = await db.query<{ category: string }>(
      `SELECT category FROM brigade.email_domain_blocks WHERE domain = $1`,
      [domain],
    );
    if (blocked.rows[0]) {
      throw new ServiceError(
        blocked.rows[0].category === "free_webmail"
          ? "Use your work email address — personal email cannot verify employment"
          : "That email provider cannot be used for verification",
        "not_a_corporate_domain",
        422,
      );
    }

    // When the company is known, the address has to be at its domain. Otherwise
    // anyone with any corporate address verifies at any company.
    if (row.company_domain && row.company_domain.toLowerCase() !== domain) {
      throw new ServiceError(
        `That address is not at ${row.company_domain}`,
        "domain_mismatch",
        422,
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    // Supersede any earlier pending attempt so a user cannot accumulate live
    // tokens by requesting repeatedly.
    await db.query(
      `UPDATE brigade.employment_verifications
       SET state = 'expired', token_hash = NULL
       WHERE experience_id = $1 AND state = 'pending'`,
      [experienceId],
    );

    const inserted = await db.query<{ id: string }>(
      `INSERT INTO brigade.employment_verifications
         (experience_id, profile_id, method, state, email_domain, email_hash, token_hash, expires_at)
       VALUES ($1, $2, 'corporate_email', 'pending', $3, $4, $5, $6)
       RETURNING id::text`,
      [experienceId, actorProfileId, domain, hash(email), hash(token), expiresAt],
    );
    const verificationId = inserted.rows[0]?.id;
    if (!verificationId) throw new ServiceError("Could not start verification", "verification_failed");

    // The token and address travel on the job because the row deliberately
    // stores only their hashes. That means a live token sits in brigade.jobs
    // until the mail is sent — acceptable because it is single-use, expires in
    // 24 hours, and PurgeFinishedJobs (the scheduler) clears finished rows. If
    // the jobs table ever needs to be readable by a wider audience than the
    // users table, move this to a separate secrets store.
    ctx.enqueue({
      queue: "mailers",
      worker: "SendVerificationEmailWorker",
      args: { verificationId, token, workEmail: email },
    });

    return { verificationId, token, expiresAt };
  }
}

export type ConfirmEmailVerificationArgs = {
  ctx: ServiceContext;
  verificationId: string;
  token: string;
};

export class ConfirmEmploymentEmailVerificationService extends BaseService<
  ConfirmEmailVerificationArgs,
  { verified: boolean; experienceId: string }
> {
  async call({ ctx, verificationId, token }: ConfirmEmailVerificationArgs) {
    const { db } = ctx;

    const found = await db.query<{
      id: string;
      experience_id: string;
      profile_id: string;
      token_hash: string | null;
      expires_at: Date | null;
      attempts: number;
      state: string;
    }>(
      `SELECT id::text, experience_id::text, profile_id::text, token_hash, expires_at, attempts, state::text
       FROM brigade.employment_verifications WHERE id = $1`,
      [verificationId],
    );
    const row = found.rows[0];
    if (!row) throw new NotFoundError("Verification not found");

    if (row.state !== "pending") {
      throw new ServiceError("That verification is no longer open", "not_pending", 422);
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await db.query(
        `UPDATE brigade.employment_verifications
         SET state = 'failed', failure_reason = 'too many attempts', token_hash = NULL WHERE id = $1`,
        [row.id],
      );
      throw new ServiceError("Too many attempts", "too_many_attempts", 429);
    }

    await db.query(
      `UPDATE brigade.employment_verifications SET attempts = attempts + 1 WHERE id = $1`,
      [row.id],
    );

    if (row.expires_at && row.expires_at.getTime() < Date.now()) {
      await db.query(
        `UPDATE brigade.employment_verifications
         SET state = 'expired', token_hash = NULL WHERE id = $1`,
        [row.id],
      );
      throw new ServiceError("That link has expired", "expired", 422);
    }

    if (!row.token_hash || !safeEqualHex(row.token_hash, hash(token))) {
      throw new ServiceError("That link is not valid", "invalid_token", 422);
    }

    await markVerified(ctx, row.experience_id, row.id, "corporate_email", row.profile_id);
    return { verified: true, experienceId: row.experience_id };
  }
}

/* ------------------------------------------------------------------ */
/* Tier 2 — rel="me" backlink from a company page                      */
/* ------------------------------------------------------------------ */

export type VerifyBacklinkArgs = {
  ctx: ServiceContext;
  experienceId: string;
  actorProfileId: string;
  /** The staff page the user claims lists them. */
  sourceUrl: string;
  profileUrlBase?: string;
  fetcher?: PageFetcher;
};

/**
 * Fetch the claimed page and look for a rel="me" link back to the profile.
 *
 * Unfakeable without control of the target domain, needs no manual review, and
 * costs one HTTP request. The check is deliberately narrow: a plain link to the
 * profile is not enough, because anyone can link to anyone. The rel="me"
 * attribute is the employer asserting identity.
 */
export class VerifyEmploymentBacklinkService extends BaseService<
  VerifyBacklinkArgs,
  { verified: boolean; evidence: Record<string, unknown> }
> {
  async call({
    ctx,
    experienceId,
    actorProfileId,
    sourceUrl,
    profileUrlBase = "https://joinbrigade.co/in",
    fetcher = defaultFetcher,
  }: VerifyBacklinkArgs) {
    const { db } = ctx;

    const experience = await db.query<{
      id: string;
      profile_id: string;
      username: string;
      company_domain: string | null;
    }>(
      `SELECT e.id::text, e.profile_id::text, p.username::text, c.domain::text AS company_domain
       FROM brigade.experiences e
       JOIN brigade.profiles p ON p.id = e.profile_id
       LEFT JOIN brigade.companies c ON c.id = e.company_id
       WHERE e.id = $1`,
      [experienceId],
    );
    const row = experience.rows[0];
    if (!row) throw new NotFoundError("Experience not found");
    if (row.profile_id !== actorProfileId) {
      throw new ServiceError("You can only verify your own roles", "forbidden", 403);
    }

    let url: URL;
    try {
      url = new URL(sourceUrl);
    } catch {
      throw new ServiceError("That is not a valid URL", "invalid_url", 422);
    }
    // Only https: an http page proves nothing about who controls the domain.
    if (url.protocol !== "https:") {
      throw new ServiceError("The page must be served over https", "insecure_url", 422);
    }

    // The page has to live on the employer's domain, or a user could point at
    // any site they happen to control.
    if (row.company_domain) {
      const host = url.hostname.toLowerCase();
      const domain = row.company_domain.toLowerCase();
      if (host !== domain && !host.endsWith(`.${domain}`)) {
        throw new ServiceError(
          `The page must be on ${row.company_domain}`,
          "domain_mismatch",
          422,
        );
      }
    }

    const attempt = await db.query<{ id: string }>(
      `INSERT INTO brigade.employment_verifications
         (experience_id, profile_id, method, state, source_url)
       VALUES ($1, $2, 'rel_me_backlink', 'pending', $3)
       RETURNING id::text`,
      [experienceId, actorProfileId, url.toString()],
    );
    const verificationId = attempt.rows[0]?.id;
    if (!verificationId) throw new ServiceError("Could not start verification", "verification_failed");

    const expectedUrls = [
      `${profileUrlBase}/${row.username}`,
      `${profileUrlBase}/${row.username}/`,
    ];

    let page: Awaited<ReturnType<PageFetcher>>;
    try {
      page = await fetcher(url.toString());
    } catch (error) {
      const reason = error instanceof Error ? error.message : "fetch failed";
      await this.fail(ctx, verificationId, reason);
      return { verified: false, evidence: { reason } };
    }

    if (page.status !== 200) {
      await this.fail(ctx, verificationId, `page returned ${page.status}`);
      return { verified: false, evidence: { status: page.status } };
    }

    const matched = findRelMeLink(page.body, expectedUrls);
    if (!matched) {
      await this.fail(ctx, verificationId, "no rel=\"me\" link back to the profile");
      return {
        verified: false,
        evidence: { expected: expectedUrls, reason: "no rel=me backlink found" },
      };
    }

    await db.query(
      `UPDATE brigade.employment_verifications SET evidence = $2::jsonb WHERE id = $1`,
      [verificationId, JSON.stringify({ matchedHref: matched, finalUrl: page.finalUrl })],
    );
    await markVerified(ctx, experienceId, verificationId, "rel_me_backlink", actorProfileId);

    return { verified: true, evidence: { matchedHref: matched, finalUrl: page.finalUrl } };
  }

  private async fail(ctx: ServiceContext, verificationId: string, reason: string) {
    await ctx.db.query(
      `UPDATE brigade.employment_verifications
       SET state = 'failed', failure_reason = $2 WHERE id = $1`,
      [verificationId, reason],
    );
  }
}

/**
 * Find an anchor whose rel contains "me" and whose href is one of the expected
 * profile URLs.
 *
 * Written as a scan over anchor tags rather than a single regex over the whole
 * document: attribute order varies, rel can hold several tokens, and quoting is
 * inconsistent in real-world HTML.
 */
export function findRelMeLink(html: string, expectedUrls: string[]): string | null {
  const expected = new Set(expectedUrls.map((u) => u.toLowerCase().replace(/\/$/, "")));

  for (const tag of html.matchAll(/<(?:a|link)\b[^>]*>/gi)) {
    const attrs = tag[0];
    const rel = /\brel\s*=\s*["']?([^"'>]*)/i.exec(attrs)?.[1] ?? "";
    if (!rel.toLowerCase().split(/\s+/).includes("me")) continue;

    const href = /\bhref\s*=\s*["']?([^"'\s>]*)/i.exec(attrs)?.[1];
    if (!href) continue;

    if (expected.has(href.toLowerCase().replace(/\/$/, ""))) return href;
  }
  return null;
}

/* ------------------------------------------------------------------ */

/**
 * Record the verified state on both the attempt and the experience.
 *
 * Current roles get an expiry — a badge that never lapses is a claim about the
 * past presented as a claim about the present. Past roles are verified as of
 * the moment they were checked and do not expire, because they cannot change.
 */
async function markVerified(
  ctx: ServiceContext,
  experienceId: string,
  verificationId: string,
  method: string,
  profileId: string,
) {
  const { db } = ctx;

  await db.query(
    `UPDATE brigade.employment_verifications
     SET state = 'verified', verified_at = now(), token_hash = NULL WHERE id = $1`,
    [verificationId],
  );

  await db.query(
    `UPDATE brigade.experiences
     SET verified_at = now(),
         verification_method = $2::brigade.verification_method,
         verification_expires_at = CASE WHEN is_current THEN now() + make_interval(secs => $3) END
     WHERE id = $1`,
    [experienceId, method, CURRENT_ROLE_VALIDITY_MS / 1000],
  );

  // A verified badge changes both the profile's completeness and its standing
  // in the directory, so both are recomputed rather than left stale.
  ctx.enqueue({
    queue: "pull",
    worker: "ProfileCompletenessWorker",
    args: { profileId },
  });
}

/**
 * Sweep expired verifications on current roles.
 *
 * Runs nightly. Clearing the badge rather than deleting the history keeps the
 * audit trail while making the public claim honest again.
 */
export class ExpireEmploymentVerificationsService extends BaseService<
  { ctx: ServiceContext },
  { expired: number }
> {
  async call({ ctx }: { ctx: ServiceContext }) {
    const result = await ctx.db.query(
      `UPDATE brigade.experiences
       SET verified_at = NULL, verification_method = NULL, verification_expires_at = NULL
       WHERE is_current
         AND verified_at IS NOT NULL
         AND verification_expires_at IS NOT NULL
         AND verification_expires_at < now()`,
    );
    return { expired: result.rowCount ?? 0 };
  }
}
