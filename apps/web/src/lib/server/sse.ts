import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

/**
 * Server-Sent Events stream backed by a Redis pub/sub subscription — true
 * event push (no polling). `prime` sends one initial snapshot event; `wrap`
 * maps each published message to the SSE payload shape the client expects.
 */
export function sseFromRedis(
  channel: string,
  opts: {
    prime?: () => Promise<unknown | null>;
    wrap?: (message: unknown) => unknown;
  } = {},
): Response {
  const encoder = new TextEncoder();
  let subscriber: ReturnType<typeof createClient> | null = null;
  let closed = false;
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

      if (opts.prime) {
        try {
          const snapshot = await opts.prime();
          if (snapshot != null) send(snapshot);
        } catch {
          /* prime is best-effort */
        }
      }

      try {
        subscriber = createClient({
          url: REDIS_URL,
          socket: { reconnectStrategy: () => false },
        });
        await subscriber.connect();
        await subscriber.subscribe(channel, (raw) => {
          let parsed: unknown = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {
            /* forward raw */
          }
          send(opts.wrap ? opts.wrap(parsed) : parsed);
        });
      } catch {
        /* Redis unavailable — keep the connection open (prime already sent) */
      }

      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          closed = true;
        }
      }, 15000);
    },
    async cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (subscriber) {
        try {
          await subscriber.unsubscribe();
          await subscriber.quit();
        } catch {
          /* ignore */
        }
      }
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
