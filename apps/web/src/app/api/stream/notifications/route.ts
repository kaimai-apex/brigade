import { getConnectProSession } from '@/lib/connectpro/server';
import { sseFromRedis } from '@/lib/server/sse';
import { dbListNotifications } from '@/lib/server/notify-db';

/**
 * Live notification stream — true push via the Redis channel notif:<userId>
 * (notification-service publishes there on every notification). One initial
 * event primes the unread count.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConnectProSession();
  if (!session?.userId) return new Response('Unauthorized', { status: 401 });

  return sseFromRedis(`notif:${session.userId}`, {
    // Primed from Postgres directly. This used to call the gateway, which does
    // not exist on the hosted site, so the badge always primed to 0 there even
    // when unread notifications were waiting.
    prime: async () => {
      try {
        const rows = await dbListNotifications(session.userId, 100);
        return { event: 'init', unread: rows.filter((n) => !n.readAt).length };
      } catch {
        return { event: 'init', unread: 0 };
      }
    },
    // each published notification -> a "new" event
    wrap: (notification) => ({ event: 'new', notification }),
  });
}
