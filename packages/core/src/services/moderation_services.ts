import { BaseService, ForbiddenError, NotFoundError, ServiceError, type ServiceContext } from "./base_service.ts";
import { NotifyService } from "./notify_service.ts";
import { Permission, can, type Viewer } from "../policies/profile_policy.ts";

/**
 * Trust & safety.
 *
 * The fraud on a professional network is financially motivated — recruitment
 * scams against people looking for work, credential fraud, corporate
 * impersonation — and the credibility of the network IS the product. One
 * publicised scam wave does more damage than six months of missing features.
 *
 * Three things here are load-bearing:
 *
 *   * `silence` removes someone from discovery WITHOUT telling them. An
 *     outright ban tells an attacker to make a new account immediately;
 *     silencing wastes their time. It is the right default for suspected spam.
 *   * Every action is appealable, and every action carries a statement of
 *     reasons. This is a legal obligation under the EU DSA, and separately it
 *     is what makes a wrongful suspension recoverable rather than a PR event.
 *   * Every action is written to the append-only moderation log. Needed for
 *     appeals, for regulatory response, for detecting moderator abuse, and for
 *     the day someone asks why an account was removed.
 */

export type ReportCategory =
  | "spam"
  | "harassment"
  | "impersonation"
  | "fake_job_posting"
  | "scam_or_fraud"
  | "misleading_credentials"
  | "inappropriate_content"
  | "underage"
  | "other";

/**
 * Fraud categories jump the queue. They are the ones where the delay between
 * report and action is measured in victims.
 */
const PRIORITY: Record<ReportCategory, number> = {
  scam_or_fraud: 100,
  fake_job_posting: 90,
  misleading_credentials: 80,
  impersonation: 70,
  underage: 100,
  harassment: 50,
  inappropriate_content: 30,
  spam: 20,
  other: 10,
};

/** Every moderator action goes through here, so the log can never be bypassed. */
async function logModeration(
  ctx: ServiceContext,
  entry: {
    moderatorId: string | null;
    action: string;
    targetType: string;
    targetId: string;
    reason?: string | null;
    detail?: Record<string, unknown>;
  },
) {
  await ctx.db.query(
    `INSERT INTO brigade.moderation_log (moderator_id, action, target_type, target_id, reason, detail)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      entry.moderatorId,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.reason ?? null,
      JSON.stringify(entry.detail ?? {}),
    ],
  );
}

function requireModerator(viewer: Viewer, bit: bigint = Permission.ManageReports) {
  if (!can(viewer, bit)) throw new ForbiddenError("Moderator permission required");
  if (!viewer?.profileId) throw new ForbiddenError("Moderator permission required");
  return viewer.profileId;
}

/* ------------------------------------------------------------------ */
/* Reporting                                                           */
/* ------------------------------------------------------------------ */

export type ReportArgs = {
  ctx: ServiceContext;
  reporterProfileId: string | null;
  targetProfileId: string;
  category: ReportCategory;
  comment?: string;
  postIds?: string[];
  jobPostingId?: string | null;
};

export class ReportService extends BaseService<ReportArgs, { reportId: string; priority: number }> {
  async call({
    ctx,
    reporterProfileId,
    targetProfileId,
    category,
    comment = "",
    postIds = [],
    jobPostingId = null,
  }: ReportArgs) {
    const { db } = ctx;

    if (reporterProfileId === targetProfileId) {
      throw new ForbiddenError("You cannot report yourself");
    }

    const target = await db.query(
      `SELECT 1 FROM brigade.profiles WHERE id = $1 AND deleted_at IS NULL`,
      [targetProfileId],
    );
    if (!target.rowCount) throw new NotFoundError("Profile not found");

    const priority = PRIORITY[category];

    const inserted = await db.query<{ id: string }>(
      `INSERT INTO brigade.reports
         (reporter_id, target_profile_id, target_post_ids, target_job_posting_id, category, comment, priority)
       VALUES ($1, $2, $3::bigint[], $4, $5::brigade.report_category, $6, $7)
       RETURNING id::text`,
      [reporterProfileId, targetProfileId, postIds, jobPostingId, category, comment, priority],
    );
    const reportId = inserted.rows[0]?.id;
    if (!reportId) throw new ServiceError("Could not file the report", "report_failed");

    // A report is a risk signal in its own right, independent of whether a
    // moderator agrees with it. Volume of reports is itself informative.
    await db.query(
      `INSERT INTO brigade.risk_signals (profile_id, signal, weight, detail)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [targetProfileId, `reported:${category}`, priority / 100, JSON.stringify({ reportId })],
    );

    ctx.enqueue({
      queue: "pull",
      worker: "ScoreProfileRiskWorker",
      args: { profileId: targetProfileId },
    });

    return { reportId, priority };
  }
}

/* ------------------------------------------------------------------ */
/* Graduated enforcement                                               */
/* ------------------------------------------------------------------ */

export type EnforcementAction = "none" | "warning" | "silence" | "suspend" | "delete";

export type EnforceArgs = {
  ctx: ServiceContext;
  viewer: Viewer;
  targetProfileId: string;
  action: EnforcementAction;
  /** The statement of reasons. Required for anything the user is told about. */
  text: string;
  reportId?: string | null;
  expiresAt?: Date | null;
};

export class EnforceModerationService extends BaseService<
  EnforceArgs,
  { warningId: string; notified: boolean }
> {
  async call({ ctx, viewer, targetProfileId, action, text, reportId = null, expiresAt = null }: EnforceArgs) {
    const { db } = ctx;
    const moderatorId = requireModerator(viewer, Permission.ManageProfiles);

    if (action !== "none" && !text.trim()) {
      // Not a formality: the DSA requires a statement of reasons, and an
      // unexplained action is one nobody can meaningfully appeal.
      throw new ServiceError(
        "An enforcement action needs a statement of reasons",
        "reason_required",
        422,
      );
    }

    const target = await db.query(
      `SELECT 1 FROM brigade.profiles WHERE id = $1 AND deleted_at IS NULL`,
      [targetProfileId],
    );
    if (!target.rowCount) throw new NotFoundError("Profile not found");

    const warning = await db.query<{ id: string }>(
      `INSERT INTO brigade.profile_warnings (profile_id, moderator_id, report_id, action, text, expires_at)
       VALUES ($1, $2, $3, $4::brigade.enforcement_action, $5, $6)
       RETURNING id::text`,
      [targetProfileId, moderatorId, reportId, action, text, expiresAt],
    );
    const warningId = warning.rows[0]?.id;
    if (!warningId) throw new ServiceError("Could not record the action", "enforcement_failed");

    switch (action) {
      case "silence":
        await db.query(`UPDATE brigade.profiles SET silenced_at = now() WHERE id = $1`, [
          targetProfileId,
        ]);
        break;
      case "suspend":
        await db.query(
          `UPDATE brigade.profiles SET suspended_at = now(), discoverable = false WHERE id = $1`,
          [targetProfileId],
        );
        // A suspended account's sessions must die with it, or the ban is
        // advisory until the token expires.
        ctx.enqueue({
          queue: "default",
          worker: "RevokeSessionsWorker",
          args: { profileId: targetProfileId },
        });
        break;
      case "delete":
        await db.query(
          `UPDATE brigade.profiles SET deleted_at = now(), discoverable = false WHERE id = $1`,
          [targetProfileId],
        );
        ctx.enqueue({
          queue: "pull",
          worker: "PurgeProfileWorker",
          args: { profileId: targetProfileId },
        });
        break;
      default:
        break;
    }

    if (reportId) {
      await db.query(
        `UPDATE brigade.reports SET action_taken_at = now(), action_taken_by = $2 WHERE id = $1`,
        [reportId, moderatorId],
      );
    }

    await logModeration(ctx, {
      moderatorId,
      action: `enforce:${action}`,
      targetType: "profile",
      targetId: targetProfileId,
      reason: text,
      detail: { warningId, reportId },
    });

    // Silence is deliberately silent. Telling a suspected spammer they have
    // been limited converts a slow, cheap containment into an immediate
    // re-registration.
    const notifiable = action === "warning" || action === "suspend";
    if (notifiable) {
      await new NotifyService().call({
        ctx,
        profileId: targetProfileId,
        fromProfileId: null,
        type: "moderation_action",
        payload: { action, text, warningId, appealable: true },
      });
    }

    return { warningId, notified: notifiable };
  }
}

/* ------------------------------------------------------------------ */
/* Appeals                                                             */
/* ------------------------------------------------------------------ */

export class SubmitAppealService extends BaseService<
  { ctx: ServiceContext; profileId: string; warningId: string; text: string },
  { appealId: string }
> {
  async call({ ctx, profileId, warningId, text }: { ctx: ServiceContext; profileId: string; warningId: string; text: string }) {
    const { db } = ctx;

    const warning = await db.query<{ profile_id: string; action: string }>(
      `SELECT profile_id::text, action::text FROM brigade.profile_warnings WHERE id = $1`,
      [warningId],
    );
    const row = warning.rows[0];
    if (!row) throw new NotFoundError("No such action");
    if (row.profile_id !== profileId) throw new ForbiddenError("That is not your appeal to make");

    const existing = await db.query(
      `SELECT 1 FROM brigade.appeals WHERE profile_warning_id = $1`,
      [warningId],
    );
    if (existing.rowCount) {
      throw new ServiceError("You have already appealed this", "already_appealed", 422);
    }

    const inserted = await db.query<{ id: string }>(
      `INSERT INTO brigade.appeals (profile_warning_id, profile_id, text)
       VALUES ($1, $2, $3) RETURNING id::text`,
      [warningId, profileId, text],
    );
    const appealId = inserted.rows[0]?.id;
    if (!appealId) throw new ServiceError("Could not submit the appeal", "appeal_failed");

    return { appealId };
  }
}

export class ReviewAppealService extends BaseService<
  { ctx: ServiceContext; viewer: Viewer; appealId: string; approve: boolean; note?: string },
  { approved: boolean; reversed: EnforcementAction | null }
> {
  async call({
    ctx,
    viewer,
    appealId,
    approve,
    note = "",
  }: { ctx: ServiceContext; viewer: Viewer; appealId: string; approve: boolean; note?: string }) {
    const { db } = ctx;
    const moderatorId = requireModerator(viewer, Permission.ManageProfiles);

    const found = await db.query<{
      id: string;
      profile_id: string;
      action: string;
      approved_at: Date | null;
      rejected_at: Date | null;
    }>(
      `SELECT a.id::text, a.profile_id::text, w.action::text, a.approved_at, a.rejected_at
       FROM brigade.appeals a
       JOIN brigade.profile_warnings w ON w.id = a.profile_warning_id
       WHERE a.id = $1`,
      [appealId],
    );
    const row = found.rows[0];
    if (!row) throw new NotFoundError("Appeal not found");
    if (row.approved_at || row.rejected_at) {
      throw new ServiceError("That appeal has already been decided", "already_decided", 422);
    }

    await db.query(
      `UPDATE brigade.appeals
       SET approved_at = CASE WHEN $2 THEN now() END,
           rejected_at = CASE WHEN $2 THEN NULL ELSE now() END,
           handled_by = $3
       WHERE id = $1`,
      [appealId, approve, moderatorId],
    );

    let reversed: EnforcementAction | null = null;
    if (approve) {
      // Upholding an appeal has to actually undo the action, not just record
      // sympathy for it.
      reversed = row.action as EnforcementAction;
      await db.query(
        `UPDATE brigade.profiles
         SET silenced_at = CASE WHEN $2 = 'silence' THEN NULL ELSE silenced_at END,
             suspended_at = CASE WHEN $2 = 'suspend' THEN NULL ELSE suspended_at END,
             deleted_at   = CASE WHEN $2 = 'delete'  THEN NULL ELSE deleted_at END
         WHERE id = $1`,
        [row.profile_id, row.action],
      );
    }

    await logModeration(ctx, {
      moderatorId,
      action: approve ? "appeal:approved" : "appeal:rejected",
      targetType: "profile",
      targetId: row.profile_id,
      reason: note,
      detail: { appealId, reversed },
    });

    await new NotifyService().call({
      ctx,
      profileId: row.profile_id,
      fromProfileId: null,
      type: "moderation_action",
      payload: { appeal: approve ? "approved" : "rejected", note },
    });

    return { approved: approve, reversed };
  }
}

/* ------------------------------------------------------------------ */
/* Blocklists and risk                                                 */
/* ------------------------------------------------------------------ */

export class BlockCanonicalEmailService extends BaseService<
  { ctx: ServiceContext; viewer: Viewer; profileId: string },
  { blocked: boolean }
> {
  async call({ ctx, viewer, profileId }: { ctx: ServiceContext; viewer: Viewer; profileId: string }) {
    const moderatorId = requireModerator(viewer, Permission.ManageProfiles);

    // Blocks the normalised hash rather than the address, so every dot and
    // plus variant of the same mailbox is covered by one row. Ban evasion by
    // email variant is the most common technique there is.
    const inserted = await ctx.db.query(
      `INSERT INTO brigade.canonical_email_blocks (canonical_email_hash, reference_profile_id)
       SELECT u.canonical_email_hash, p.id
       FROM brigade.profiles p JOIN brigade.users u ON u.id = p.user_id
       WHERE p.id = $1 AND u.canonical_email_hash IS NOT NULL
       ON CONFLICT (canonical_email_hash) DO NOTHING`,
      [profileId],
    );

    await logModeration(ctx, {
      moderatorId,
      action: "blocklist:canonical_email",
      targetType: "profile",
      targetId: profileId,
    });

    return { blocked: (inserted.rowCount ?? 0) > 0 };
  }
}

/**
 * Turn accumulated signals into a score that PRIORITISES human review.
 *
 * Deliberately not an auto-ban: a false positive here is a real person locked
 * out of a job search, which is a worse outcome than a scammer surviving
 * another hour. The score decides queue order, a human decides everything else.
 */
export class ScoreProfileRiskService extends BaseService<
  { ctx: ServiceContext; profileId: string },
  { score: number; signals: number }
> {
  async call({ ctx, profileId }: { ctx: ServiceContext; profileId: string }) {
    const { db } = ctx;

    const signals = await db.query<{ total: string; count: string }>(
      `SELECT coalesce(sum(weight), 0)::text AS total, count(*)::text AS count
       FROM brigade.risk_signals
       WHERE profile_id = $1 AND created_at > now() - interval '90 days'`,
      [profileId],
    );

    // An unverified claim to work somewhere with no other verified employees is
    // the single strongest fake-employer signal.
    const unverifiedEmployer = await db.query<{ count: string }>(
      `SELECT count(*)::text FROM brigade.experiences e
       WHERE e.profile_id = $1 AND e.is_current AND e.verified_at IS NULL
         AND e.company_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM brigade.experiences other
           WHERE other.company_id = e.company_id AND other.verified_at IS NOT NULL
         )`,
      [profileId],
    );

    // A young account sending many requests that nobody accepts is either
    // scraping the graph or spamming it.
    const requestRatio = await db.query<{ sent: string; accepted: string }>(
      `SELECT count(*) FILTER (WHERE requested_by = $1)::text AS sent,
              count(*) FILTER (WHERE requested_by = $1 AND state = 'accepted')::text AS accepted
       FROM brigade.connections
       WHERE (profile_id = $1 OR target_profile_id = $1)`,
      [profileId],
    );

    const sent = Number(requestRatio.rows[0]?.sent ?? 0);
    const accepted = Number(requestRatio.rows[0]?.accepted ?? 0);
    const lowAcceptance = sent >= 20 && accepted / Math.max(sent, 1) < 0.15;

    const score =
      Number(signals.rows[0]?.total ?? 0) * 10 +
      Number(unverifiedEmployer.rows[0]?.count ?? 0) * 15 +
      (lowAcceptance ? 25 : 0);

    if (lowAcceptance) {
      await db.query(
        `INSERT INTO brigade.risk_signals (profile_id, signal, weight, detail)
         VALUES ($1, 'low_connection_acceptance', 2.5, $2::jsonb)`,
        [profileId, JSON.stringify({ sent, accepted })],
      );
    }

    return { score: Math.round(score), signals: Number(signals.rows[0]?.count ?? 0) };
  }
}

/**
 * The moderator queue: highest priority first, oldest first within a priority.
 * Unactioned reports only — a queue that shows resolved items is one nobody
 * trusts as a worklist.
 */
export class ModerationQueueService extends BaseService<
  { ctx: ServiceContext; viewer: Viewer; limit?: number },
  { reports: Record<string, unknown>[] }
> {
  async call({ ctx, viewer, limit = 50 }: { ctx: ServiceContext; viewer: Viewer; limit?: number }) {
    requireModerator(viewer, Permission.ViewModerationQueue);

    const result = await ctx.db.query(
      `SELECT r.id::text, r.category::text, r.priority, r.comment, r.created_at,
              r.target_profile_id::text AS target_profile_id,
              p.username::text, p.display_name,
              (SELECT count(*)::int FROM brigade.reports r2
               WHERE r2.target_profile_id = r.target_profile_id) AS reports_against_target,
              coalesce((SELECT sum(weight) FROM brigade.risk_signals rs
                        WHERE rs.profile_id = r.target_profile_id
                          AND rs.created_at > now() - interval '90 days'), 0)::float AS risk
       FROM brigade.reports r
       JOIN brigade.profiles p ON p.id = r.target_profile_id
       WHERE r.action_taken_at IS NULL
       ORDER BY r.priority DESC, r.created_at ASC
       LIMIT $1`,
      [limit],
    );

    return { reports: result.rows };
  }
}
