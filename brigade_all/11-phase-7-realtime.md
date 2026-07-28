# 11 — Phase 7: Realtime / Streaming

**Goal:** Notifications, messages, and feed updates arrive without polling.

**Effort:** 1–2 weeks solo
**Depends on:** Phase 4
**Priority:** Medium — defer past Phase 8 if resources are tight

**Reference:** `streaming/` (separate Node.js service), `app/controllers/api/v1/streaming_controller.rb`,
`Procfile`, `app/javascript/mastodon/stream.js`

---

## The architecture

Mastodon runs streaming as a **separate Node.js process**, not inside Rails. Three
deployables share one Postgres and one Redis:

```
web         Rails/Puma      HTTP + API
sidekiq     Ruby            background jobs
streaming   Node.js         WebSocket connections only
```

The reason is concurrency models. Rails processes hold a thread per request — fine for
short HTTP requests, catastrophic for 50,000 idle WebSocket connections. Node's event loop
holds idle connections almost for free.

**The same reasoning applies whatever your stack.** Even if Brigade's API is already Node,
keep streaming as its own process: it scales on a different axis (connection count, not
request rate), it must not be restarted when you deploy the API, and a memory leak in one
shouldn't take down the other.

---

## Data flow

```
CreatePostService
  └─ FanOutOnWriteWorker
       ├─ ZADD feed:home:{receiver}          (Phase 4)
       └─ PUBLISH timeline:{receiver} {json}  ← Redis pub/sub
                        │
                 streaming service (subscribed)
                        │
                 WebSocket → connected client
```

Redis pub/sub is the bus between the job workers and the streaming service. Workers don't
know about WebSockets; the streaming service doesn't know about business logic. Clean seam.

Note the ordering: write to the feed **first**, then publish. If a client reconnects
between the two it re-reads the feed and gets the item anyway. Reversed, it can miss it.

---

## Channels

Mastodon's streaming channels, adapted:

```
user                      your feed + notifications  (the main one)
user:notification         notifications only, for low-bandwidth clients
direct                    messages
list:{id}                 talent pool / segment feeds
hashtag:{tag}             skill/topic feeds
public                    firehose — admin/debug only
```

Brigade additions:

```
profile_views             live "someone viewed your profile"
application:{job_id}      recruiter — live application arrivals
company:{id}              company page activity for admins
presence                  online/typing indicators for messaging
```

**Presence is a trap.** It looks trivial and it is the single most expensive channel to
run — every user broadcasting state changes to every connection watching them, continuously.
Build it last, scope it narrowly (active conversations only, never a global online list),
and set a TTL-based heartbeat rather than tracking true connection state.

---

## Authentication

The streaming service must authenticate the same OAuth tokens as the API, without a
round-trip to the API on every connection.

Options, in order of preference:

1. **Shared token store in Redis.** API writes token → user mappings; streaming reads them.
   Simple, revocation is instant.
2. **Signed JWT** with a short TTL. No lookup, but revocation is hard.
3. **Direct DB read** from the streaming service. Works, couples the services to one schema.

Use option 1. Token revocation on logout or suspension must immediately drop the WebSocket,
and only a shared store gives you that.

Never accept tokens in a query string — they land in access logs. Use the
`Sec-WebSocket-Protocol` header or an initial auth frame.

---

## Filtering

The same visibility rules from `FeedManager#filter?` apply to streamed events. A blocked
user's post must not arrive over the socket just because it took a different path.

Two approaches:

- **Filter at publish time** — workers publish per-receiver, already filtered. More Redis
  traffic, simpler streaming service. *Preferred.*
- **Filter at delivery** — publish once to a broad channel, streaming service filters per
  connection. Fewer messages, but the streaming service now needs block/mute state,
  duplicating logic and coupling the services.

Take the first. The extra Redis publishes are cheap; duplicated filtering logic that can
drift out of sync is not — and the drift shows up as a privacy incident.

---

## Client behavior

```
connect → subscribe to channels → receive events → update the query cache
```

Requirements:

- **Exponential backoff with jitter** on reconnect. Without jitter, a streaming deploy
  causes every client to reconnect simultaneously and knock the service over again.
- **Reconcile on reconnect.** Fetch anything missed via the REST API using the last seen
  ID; don't assume the socket caught everything.
- **Graceful degradation.** If the socket won't connect (corporate proxies block WebSockets
  more often than you'd expect — and your users are on corporate networks), fall back to
  polling. The app must be fully functional without realtime.
- **Pause when backgrounded.** Disconnect on tab hide, reconnect on show.

---

## Scaling

- Streaming scales on **connection count**; API scales on **request rate**. Separate
  autoscaling policies.
- Sticky sessions are unnecessary — any instance can serve any connection, since state
  lives in Redis.
- Budget ~10KB of memory per idle connection as a planning figure.
- Monitor: connections per instance, message publish rate, Redis pub/sub throughput,
  reconnect rate. A reconnect-rate spike is the earliest signal of trouble.

---

## Exit criteria

- [ ] Streaming runs as its own process with its own deploy
- [ ] Redis pub/sub bridges workers to streaming; workers know nothing about sockets
- [ ] Feed write happens before publish
- [ ] Token auth via shared Redis store; revocation drops the connection immediately
- [ ] Filtering at publish time; no visibility logic in the streaming service
- [ ] Client reconnects with exponential backoff + jitter, reconciles missed events
- [ ] App fully functional with WebSockets blocked
- [ ] Load tested to 10k concurrent connections
- [ ] Connection count, publish rate, and reconnect rate monitored
