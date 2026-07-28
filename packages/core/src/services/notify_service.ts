import { BaseService, type ServiceContext } from "./base_service.ts";

/**
 * The ONLY place a notification is created. Not "the usual place" — the only
 * one, and `grep -rn "INSERT INTO brigade.notifications"` should return exactly
 * this file.
 *
 * If notification creation is scattered across a dozen services, then muting,
 * batching, digest email and per-type preferences each have to be implemented a
 * dozen times, and one of them will be missed. Funnelling everything through
 * here is what makes filtering and notification policy addable later without
 * touching a single call site.
 */

export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "post_reaction"
  | "post_comment"
  | "mention"
  | "endorsement"
  | "recommendation_request"
  | "recommendation_approved"
  | "profile_view"
  | "job_application"
  | "employment_verified"
  | "moderation_action";

export type NotifyArgs = {
  ctx: ServiceContext;
  /** Who receives it. */
  profileId: string;
  /** Who caused it. Null for system notifications. */
  fromProfileId?: string | null;
  type: NotificationType;
  postId?: string | null;
  payload?: Record<string, unknown>;
};

export type NotifyResult = { notificationId: string | null; suppressed: boolean };

export class NotifyService extends BaseService<NotifyArgs, NotifyResult> {
  async call({
    ctx,
    profileId,
    fromProfileId = null,
    type,
    postId = null,
    payload = {},
  }: NotifyArgs): Promise<NotifyResult> {
    const { db } = ctx;

    // Never notify someone about their own action.
    if (fromProfileId && fromProfileId === profileId) {
      return { notificationId: null, suppressed: true };
    }

    if (fromProfileId) {
      // A block in either direction suppresses entirely; a mute only silences.
      const blocked = await db.query(
        `SELECT 1 FROM brigade.blocks
         WHERE (profile_id = $1 AND target_profile_id = $2)
            OR (profile_id = $2 AND target_profile_id = $1)
         LIMIT 1`,
        [profileId, fromProfileId],
      );
      if (blocked.rowCount) return { notificationId: null, suppressed: true };
    }

    // Notifications from strangers are marked `filtered` rather than dropped:
    // they land in a review list instead of the main one. On a professional
    // network the stranger is often the point (a recruiter, a warm intro), so
    // discarding them would be wrong — but so would letting spam through.
    let filtered = false;
    if (fromProfileId) {
      const known = await db.query(
        `SELECT 1 FROM brigade.connections
         WHERE state = 'accepted'
           AND ((profile_id = LEAST($1::bigint, $2::bigint) AND target_profile_id = GREATEST($1::bigint, $2::bigint)))
         UNION ALL
         SELECT 1 FROM brigade.follows
         WHERE profile_id = $1 AND target_profile_id = $2
         LIMIT 1`,
        [profileId, fromProfileId],
      );

      const muted = await db.query(
        `SELECT hide_notifications FROM brigade.mutes
         WHERE profile_id = $1 AND target_profile_id = $2
           AND (expires_at IS NULL OR expires_at > now())`,
        [profileId, fromProfileId],
      );
      if (muted.rows[0]?.hide_notifications) return { notificationId: null, suppressed: true };

      filtered = known.rowCount === 0 && type !== "connection_request";
    }

    const inserted = await db.query<{ id: string }>(
      `INSERT INTO brigade.notifications (profile_id, from_profile_id, type, post_id, payload, filtered)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING id::text`,
      [profileId, fromProfileId, type, postId, JSON.stringify(payload), filtered],
    );

    const row = inserted.rows[0];
    if (!row) return { notificationId: null, suppressed: true };

    // Delivery is a side effect, so it is a job. Email, push and the websocket
    // publish all hang off this one enqueue.
    ctx.enqueue({
      queue: "push",
      worker: "DeliverNotificationWorker",
      args: { notificationId: row.id },
    });

    return { notificationId: row.id, suppressed: false };
  }
}
