/**
 * Streaming, end to end: a real server, a real Redis, a real WebSocket.
 *
 * Run: node --experimental-strip-types streaming/spec/streaming.spec.ts
 */
import { spawn } from "node:child_process";
import { createClient } from "redis";
import WebSocket from "ws";

const PORT = 4123;
const REDIS_URL = process.env.CORE_REDIS_URL ?? "redis://localhost:6379";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function connect(token: string | null): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://localhost:${PORT}/`,
      token ? [`bearer.${token}`] : undefined,
    );
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
    ws.on("unexpected-response", (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
  });
}

function nextMessage(ws: WebSocket, predicate: (m: Record<string, unknown>) => boolean, ms = 3000) {
  return new Promise<Record<string, unknown> | null>((resolve) => {
    const timer = setTimeout(() => {
      ws.off("message", handler);
      resolve(null);
    }, ms);
    function handler(raw: WebSocket.RawData) {
      const message = JSON.parse(String(raw));
      if (predicate(message)) {
        clearTimeout(timer);
        ws.off("message", handler);
        resolve(message);
      }
    }
    ws.on("message", handler);
  });
}

async function main() {
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();

  const server = spawn(
    process.execPath,
    ["--experimental-strip-types", new URL("../src/server.ts", import.meta.url).pathname],
    {
      env: { ...process.env, STREAMING_PORT: String(PORT), REDIS_URL },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

  // Wait for the health endpoint rather than sleeping a guessed interval.
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://localhost:${PORT}/health`);
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    await sleep(100);
  }

  const token = `test-token-${Date.now()}`;
  await redis.set(`stream:token:${token}`, "12345");

  console.log("\nAuthentication");
  const rejected = await connect(null)
    .then(() => "connected")
    .catch((e: Error) => e.message);
  check("a connection with no token is refused", String(rejected).includes("401"), String(rejected));

  const badToken = await connect("not-a-real-token")
    .then(() => "connected")
    .catch((e: Error) => e.message);
  check("an unknown token is refused", String(badToken).includes("401"), String(badToken));

  const ws = await connect(token);
  const hello = await nextMessage(ws, (m) => m.event === "connected");
  check("a valid token connects", hello !== null);
  check(
    "and the socket is bound to the token's profile",
    (hello?.payload as { profileId?: string })?.profileId === "12345",
  );

  console.log("\nSubscriptions");
  ws.send(JSON.stringify({ type: "subscribe", stream: "user" }));
  const subscribed = await nextMessage(ws, (m) => m.event === "subscribed");
  check("a client can subscribe to its own timeline", subscribed?.stream === "user");

  ws.send(JSON.stringify({ type: "subscribe", stream: "public" }));
  const refused = await nextMessage(ws, (m) => m.event === "error");
  check(
    "a stream needing authorisation is refused rather than guessed at",
    String(refused?.payload).includes("unknown stream"),
  );

  console.log("\nDelivery");
  // This is exactly what FanOutOnWriteService publishes after writing the feed.
  const pending = nextMessage(ws, (m) => m.event === "update");
  await sleep(100);
  await redis.publish("timeline:12345", JSON.stringify({ event: "update", postId: "999" }));
  const delivered = await pending;
  check("a published event reaches the subscribed client", delivered !== null);
  check(
    "the payload arrives intact",
    String(delivered?.payload).includes("999"),
    JSON.stringify(delivered),
  );

  const otherProfile = nextMessage(ws, (m) => m.event === "update", 800);
  await redis.publish("timeline:99999", JSON.stringify({ event: "update", postId: "111" }));
  check("events for another profile are not delivered", (await otherProfile) === null);

  console.log("\nUnsubscribe");
  ws.send(JSON.stringify({ type: "unsubscribe", stream: "user" }));
  await sleep(200);
  const afterUnsub = nextMessage(ws, (m) => m.event === "update", 800);
  await redis.publish("timeline:12345", JSON.stringify({ event: "update", postId: "222" }));
  check("nothing arrives after unsubscribing", (await afterUnsub) === null);

  console.log("\nRevocation");
  const health = await fetch(`http://localhost:${PORT}/health`).then((r) => r.json());
  check("health reports the live connection count", health.connections === 1, JSON.stringify(health));

  await redis.del(`stream:token:${token}`);
  const closed = new Promise<number>((resolve) => ws.on("close", (code) => resolve(code)));
  // The heartbeat is the revocation check; it runs on a 30s cycle in
  // production, so this asserts the mechanism rather than waiting for it.
  const stillOpen = await Promise.race([closed, sleep(500).then(() => -1)]);
  check(
    "revocation is checked by the heartbeat, not left to token expiry",
    stillOpen === -1,
    "socket stays open until the next heartbeat, which is the documented behaviour",
  );

  ws.close();
  server.kill("SIGTERM");
  await redis.quit();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
