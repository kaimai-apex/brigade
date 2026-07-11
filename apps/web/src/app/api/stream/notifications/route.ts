import { cookies } from 'next/headers';

/**
 * Live notification stream (Server-Sent Events). The browser holds one
 * persistent EventSource; this route pushes unread-count + new-notification
 * events. Backed server-side by a short poll of the notifications API — the
 * notification-service also publishes each notification to a Redis channel
 * (`notif:<userId>`) for a future true-push consumer.
 */

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const dynamic = 'force-dynamic';

type Notif = { id: string; readAt?: string | null; type: string };

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('connectpro_access_token')?.value;
  if (!token) return new Response('Unauthorized', { status: 401 });

  const encoder = new TextEncoder();
  let closed = false;
  let interval: ReturnType<typeof setInterval> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const seen = new Set<string>();
      let primed = false;

      async function poll() {
        try {
          const res = await fetch(`${GATEWAY}/api/v1/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (!res.ok) return;
          const json = (await res.json()) as { data?: Notif[] };
          const items = json.data ?? [];
          const unread = items.filter((n) => !n.readAt).length;
          if (!primed) {
            items.forEach((n) => seen.add(n.id));
            primed = true;
            send({ type: 'init', unread });
          } else {
            const fresh = items.filter((n) => !seen.has(n.id));
            fresh.forEach((n) => seen.add(n.id));
            send(
              fresh.length > 0
                ? { type: 'new', unread, notifications: fresh }
                : { type: 'unread', unread },
            );
          }
        } catch {
          /* transient — keep the stream open */
        }
      }

      await poll();
      interval = setInterval(poll, 4000);
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          closed = true;
        }
      }, 15000);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
