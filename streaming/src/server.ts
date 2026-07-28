import { createServer, type IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { createClient } from "redis";

/**
 * Brigade streaming — its own process, deliberately.
 *
 * It scales on a different axis to the API: connection count, not request
 * rate. A web process holds resources per in-flight request, which is fine for
 * short HTTP calls and ruinous for fifty thousand idle sockets. Keeping this
 * separate also means an API deploy does not drop every open connection, and a
 * leak in one cannot take down the other.
 *
 * It knows nothing about business logic. Workers publish to Redis; this
 * subscribes and forwards. The seam is one channel name.
 *
 * Events are filtered AT PUBLISH TIME by the fan-out worker, which already
 * knows each receiver's blocks and mutes. Filtering here instead would mean
 * duplicating that logic in a second service, where it would drift — and the
 * drift would show up as a privacy incident rather than a bug.
 */

const PORT = Number(process.env.STREAMING_PORT ?? 4000);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

/** Tokens are looked up in Redis, written there by the API on login. A shared
 *  store is what makes revocation instant: logout or suspension deletes the
 *  key and the next heartbeat drops the socket. A signed JWT would be cheaper
 *  and impossible to revoke in time. */
const tokenKey = (token: string) => `stream:token:${token}`;

type Client = {
  socket: WebSocket;
  profileId: string;
  token: string;
  channels: Set<string>;
  alive: boolean;
};

const clients = new Set<Client>();

/** Channels a client may subscribe to, and how each maps to a Redis channel. */
function resolveChannel(name: string, profileId: string): string | null {
  switch (name) {
    case "user":
      return `timeline:${profileId}`;
    case "user:notification":
      return `notif:${profileId}`;
    case "direct":
      return `msg:${profileId}`;
    case "profile_views":
      return `views:${profileId}`;
    default:
      // Everything else — list:, company:, hashtag: — needs an authorisation
      // check that belongs in the API, so it is refused here rather than
      // guessed at.
      return null;
  }
}

async function main() {
  const redis = createClient({ url: REDIS_URL });
  const subscriber = redis.duplicate();

  redis.on("error", (e) => console.error("[streaming] redis", e));
  subscriber.on("error", (e) => console.error("[streaming] redis/sub", e));

  await redis.connect();
  await subscriber.connect();

  const server = createServer((req, res) => {
    // A health endpoint the load balancer can use without opening a socket.
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, connections: clients.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    try {
      const token = extractToken(request);
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const profileId = await redis.get(tokenKey(token));
      if (!profileId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        onConnection(ws, profileId, token, subscriber);
      });
    } catch (error) {
      console.error("[streaming] upgrade failed", error);
      socket.destroy();
    }
  });

  /**
   * Heartbeat. A socket whose peer vanished without a close frame — a laptop
   * lid, a dropped mobile connection — stays "open" forever otherwise, and the
   * connection count drifts upward until it is the alerting metric that lies.
   */
  const heartbeat = setInterval(async () => {
    for (const client of clients) {
      if (!client.alive) {
        client.socket.terminate();
        clients.delete(client);
        continue;
      }
      // Revocation check: the token is gone, so the session is over.
      if (!(await redis.get(tokenKey(client.token)))) {
        client.socket.close(4001, "session ended");
        clients.delete(client);
        continue;
      }
      client.alive = false;
      client.socket.ping();
    }
  }, 30_000);

  server.listen(PORT, () => {
    console.log(`[streaming] listening on ${PORT}`);
  });

  const shutdown = async () => {
    clearInterval(heartbeat);
    for (const client of clients) client.socket.close(1001, "server shutting down");
    await subscriber.quit().catch(() => undefined);
    await redis.quit().catch(() => undefined);
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

function extractToken(request: IncomingMessage): string | null {
  // Never a query string: those land in access logs, proxy logs and referrers.
  const protocol = request.headers["sec-websocket-protocol"];
  if (typeof protocol === "string") {
    const parts = protocol.split(",").map((p) => p.trim());
    const bearer = parts.find((p) => p.startsWith("bearer."));
    if (bearer) return bearer.slice("bearer.".length);
  }
  const auth = request.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function onConnection(
  socket: WebSocket,
  profileId: string,
  token: string,
  subscriber: ReturnType<typeof createClient>,
) {
  const client: Client = { socket, profileId, token, channels: new Set(), alive: true };
  clients.add(client);

  socket.on("pong", () => {
    client.alive = true;
  });

  socket.on("message", async (raw) => {
    let message: { type?: string; stream?: string };
    try {
      message = JSON.parse(String(raw));
    } catch {
      return send(socket, { event: "error", payload: "malformed message" });
    }

    if (message.type === "subscribe" && message.stream) {
      const channel = resolveChannel(message.stream, profileId);
      if (!channel) {
        return send(socket, { event: "error", payload: `unknown stream: ${message.stream}` });
      }
      if (client.channels.has(channel)) return;

      client.channels.add(channel);
      await subscriber.subscribe(channel, (payload) => {
        // Re-check membership: an unsubscribe may have raced the publish.
        if (!client.channels.has(channel)) return;
        send(socket, { event: "update", stream: message.stream, payload });
      });
      send(socket, { event: "subscribed", stream: message.stream });
    }

    if (message.type === "unsubscribe" && message.stream) {
      const channel = resolveChannel(message.stream, profileId);
      if (channel) client.channels.delete(channel);
    }
  });

  socket.on("close", () => {
    clients.delete(client);
  });

  socket.on("error", (error) => {
    console.error("[streaming] socket", error);
    clients.delete(client);
  });

  send(socket, { event: "connected", payload: { profileId } });
}

function send(socket: WebSocket, message: unknown) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

main().catch((error) => {
  console.error("[streaming] failed to start", error);
  process.exit(1);
});
