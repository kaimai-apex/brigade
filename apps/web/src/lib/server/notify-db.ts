import { getPool } from "@connectpro/common";

/**
 * The record that something happened to a member.
 *
 * There is no notifications screen any more — the bell, the list and the live
 * stream went with the social network they were mostly built for. What is left
 * is written by the booking flows: a session booked, confirmed, cancelled,
 * refunded. Those are worth keeping even with nowhere to display them yet,
 * because they are the audit trail for money changing hands, and the surface
 * that reads them back is a small job on top of rows that already exist.
 *
 * The Redis publish is gone with the SSE routes that consumed it. Nothing
 * subscribed to `notif:<userId>` any more, so connecting a client per booking
 * was pure cost.
 */

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  payload: unknown;
  read_at: string | null;
  created_at: string;
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
    // Absent row = opted in, which is the convention the table was built with.
    const prefs = await getPool().query(
      "SELECT in_app FROM notifications.notification_preferences WHERE user_id = $1",
      [userId],
    );
    if (prefs.rows.length > 0 && prefs.rows[0].in_app === false) return;

    await getPool().query(
      `INSERT INTO notifications.notifications (user_id, type, payload)
       VALUES ($1, $2, $3)`,
      [userId, type, JSON.stringify(payload)],
    );
  } catch (error) {
    console.error("[notify]", type, error instanceof Error ? error.message : error);
  }
}
