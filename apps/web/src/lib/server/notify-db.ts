import { getPool } from "@connectpro/common";
import { createClient } from "redis";

/**
 * Direct-Postgres notification writer.
 *
 * notification-service owns notifications, but it only exists on a developer's
 * laptop: the hosted site runs apps/web alone, so anything written through the
 * direct-DB layer (profile-db.ts) had no way to tell anyone it happened. A
 * Brigade invitation created a row and notified nobody — the recipient learned
 * about it only if they happened to open /brigade.
 *
 * This writes the same `notifications.notifications` row and publishes to the
 * same `notif:<userId>` Redis channel the SSE routes already listen on, so the
 * microservice and the direct path produce identical results.
 */

const REDIS_URL = process.env.REDIS_URL;

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  payload: unknown;
  read_at: string | null;
  created_at: string;
}

/** Mirrors notification-service's format() so both paths render the same. */
function format(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    payload: row.payload,
    readAt: row.read_at,
    read: Boolean(row.read_at),
    createdAt: row.created_at,
  };
}

/**
 * Best-effort realtime push. A short-lived client keeps this usable from
 * serverless handlers, where a long-lived connection would outlive the request.
 */
async function publish(userId: string, notification: unknown) {
  if (!REDIS_URL) return;
  let client: ReturnType<typeof createClient> | null = null;
  try {
    client = createClient({
      url: REDIS_URL,
      socket: { connectTimeout: 2000, reconnectStrategy: () => false },
    });
    await client.connect();
    await client.publish(`notif:${userId}`, JSON.stringify(notification));
  } catch {
    // The row is already committed; a missed live ping is not worth failing on.
  } finally {
    await client?.disconnect().catch(() => null);
  }
}

/**
 * Record a notification for `userId`. Never throws: a notification failure must
 * not roll back the action that earned it.
 */
export async function dbNotify(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    // Same opt-out notification-service honours (absent row = opted in), so the
    // toggle on /settings/notifications governs both writers.
    const prefs = await getPool().query(
      "SELECT in_app FROM notifications.notification_preferences WHERE user_id = $1",
      [userId],
    );
    if (prefs.rows.length > 0 && prefs.rows[0].in_app === false) return;

    const res = await getPool().query(
      `INSERT INTO notifications.notifications (user_id, type, payload)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, type, payload, read_at, created_at`,
      [userId, type, JSON.stringify(payload)],
    );
    await publish(userId, format(res.rows[0]));
  } catch (error) {
    console.error("[notify]", type, error instanceof Error ? error.message : error);
  }
}

const NOTIFICATION_COLUMNS = "id, user_id, type, payload, read_at, created_at";

/** Newest first, matching notification-service's list(). */
export async function dbListNotifications(userId: string, limit = 20) {
  const res = await getPool().query(
    `SELECT ${NOTIFICATION_COLUMNS} FROM notifications.notifications
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 100)],
  );
  return res.rows.map(format);
}

/** Scoped to the owner: a caller must not be able to read another user's id. */
export async function dbMarkNotificationRead(id: string, userId: string) {
  const res = await getPool().query(
    `UPDATE notifications.notifications SET read_at = now()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL
     RETURNING ${NOTIFICATION_COLUMNS}`,
    [id, userId],
  );
  // Already-read is success, not a 404 — marking twice is a no-op, and the
  // page fires one call per unread row without coordinating.
  return res.rows[0] ? format(res.rows[0]) : null;
}

export async function dbMarkAllNotificationsRead(userId: string) {
  const res = await getPool().query(
    `UPDATE notifications.notifications SET read_at = now()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return { updated: res.rowCount ?? 0 };
}
