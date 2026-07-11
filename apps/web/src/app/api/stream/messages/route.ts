import { getConnectProSession } from '@/lib/connectpro/server';
import { sseFromRedis } from '@/lib/server/sse';

/**
 * Live message stream — true push via the Redis channel msg:<userId>
 * (messaging-service publishes there for each recipient on send).
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getConnectProSession();
  if (!session?.userId) return new Response('Unauthorized', { status: 401 });

  return sseFromRedis(`msg:${session.userId}`, {
    wrap: (message) => ({ event: 'message', message }),
  });
}
