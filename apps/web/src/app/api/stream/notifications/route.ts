import { cookies } from 'next/headers';
import { getConnectProSession } from '@/lib/connectpro/server';
import { sseFromRedis } from '@/lib/server/sse';

/**
 * Live notification stream — true push via the Redis channel notif:<userId>
 * (notification-service publishes there on every notification). One initial
 * event primes the unread count.
 */

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConnectProSession();
  if (!session?.userId) return new Response('Unauthorized', { status: 401 });

  const cookieStore = await cookies();
  const token = cookieStore.get('connectpro_access_token')?.value;

  return sseFromRedis(`notif:${session.userId}`, {
    prime: async () => {
      try {
        const res = await fetch(`${GATEWAY}/api/v1/notifications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!res.ok) return { event: 'init', unread: 0 };
        const json = (await res.json()) as {
          data?: { readAt?: string | null }[];
        };
        const unread = (json.data ?? []).filter((n) => !n.readAt).length;
        return { event: 'init', unread };
      } catch {
        return { event: 'init', unread: 0 };
      }
    },
    // each published notification -> a "new" event
    wrap: (notification) => ({ event: 'new', notification }),
  });
}
