# Runbook

What to do when something is wrong, and the process topology it assumes.

## Topology

Four process types, one image (`Dockerfile`), different entrypoints (`Procfile`):

| Process | Scales on | Notes |
|---|---|---|
| `web` | request rate | Next.js on Vercel today |
| `worker` | queue depth | `pnpm worker`. Safe to run many. |
| `scheduler` | — | **Singleton.** Never run two. |
| `streaming` | connection count | WebSockets only. Deploying it drops sockets; clients reconnect with backoff. |

They share one Postgres and one Redis. Everything below assumes
`DATABASE_URL` and `REDIS_URL` are set.

## Migrations

```bash
DATABASE_URL=... pnpm db:migrate --status   # what is applied, what is pending
DATABASE_URL=... pnpm db:migrate            # apply pending, in order, once each
```

Applied versions are recorded in `brigade.schema_migrations`, so this is safe on
every deploy. Run it **before** the new code, since migrations are additive and
old code tolerates new columns.

> The hosted database was previously migrated by hand, and a deploy landing
> ahead of its migration is what took the directory down with a missing column.
> That is the failure this runner exists to prevent.

---

## The top failure modes

### 1. Jobs are queued but nothing is processing them

**Symptom:** notifications stop arriving, feeds go stale, `brigade.jobs` grows.

```sql
SELECT queue, state, count(*) FROM brigade.jobs GROUP BY 1, 2 ORDER BY 1, 2;
SELECT worker, last_error, count(*) FROM brigade.jobs
 WHERE state = 'dead' GROUP BY 1, 2 ORDER BY 3 DESC;
```

- All `queued`, none `running` → no worker is alive. Check the worker process.
- Many `running` with old `locked_at` → workers died holding jobs. The scheduler
  reaps these every 5 minutes; force it with
  `SELECT brigade.reap_stalled_jobs(300);`
- Many `dead` with the same `last_error` → a real bug. Fix, then requeue:
  `UPDATE brigade.jobs SET state='queued', attempts=0 WHERE state='dead' AND worker='X';`

### 2. Feeds are empty or wrong

Feeds are a **cache**, always rebuildable. Nothing in a feed is the only copy of
anything.

```ts
await new FeedManager(redis, pool).populateHome(profileId);
```

- One user affected → rebuild that feed.
- Everyone affected → Redis was flushed or failed over. Feeds repopulate lazily
  on read; no action strictly required.
- A user sees someone they blocked → the block is the bug, not the feed. Check
  `BlockService` ran fully, then rebuild.

### 3. The directory is empty or 500ing

Almost always a missing column, i.e. a migration that has not run.

```bash
DATABASE_URL=... pnpm db:migrate --status
```

`ensure-directory-schema.ts` in the web app applies the additive directory DDL
lazily as a safety net, but it is a net, not a substitute.

### 4. A scam wave

1. `/admin/reports` — fraud categories sort to the top by design.
2. **Silence first, suspend second.** Silencing removes the account from
   discovery without telling it, so the attacker keeps working a dead account
   instead of registering a new one immediately.
3. Block the mailbox, not the address:
   `BlockCanonicalEmailService` — this covers every plus-tagged variant.
4. Every action needs a statement of reasons and is appealable. That is a legal
   requirement, not a courtesy.

Check for a pattern before acting individually:

```sql
SELECT signal, count(*) FROM brigade.risk_signals
 WHERE created_at > now() - interval '24 hours' GROUP BY 1 ORDER BY 2 DESC;
```

### 5. Streaming connections climbing without users

```bash
curl http://<streaming-host>/health   # {"ok":true,"connections":N}
```

The 30-second heartbeat terminates sockets whose peer vanished. If the count
still climbs, restart streaming — clients reconnect with backoff and jitter, and
the app is fully functional over polling without it.

### 6. Suspended account still active

The suspension writes `suspended_at` and enqueues `RevokeSessionsWorker`. If the
account is still acting, that job did not run — see failure mode 1. Until it
does, the account keeps its session until the token expires.

---

## Things that are true and worth remembering

- **`MAX_ITEMS = 800`.** This is what makes Redis cost predictable. Resist
  raising it; anyone scrolling past 800 falls through to Postgres.
- **The moderation log is append-only**, enforced by a trigger. `UPDATE` and
  `DELETE` raise. Use `TRUNCATE` only in tests.
- **Verification expires.** Current roles re-verify every 6 months. The
  `verified_only` filter checks expiry directly, so a lapsed badge stops
  matching before the nightly sweep.
- **Never log PII or tokens.** `lib/log.ts` redacts by field name at every
  depth; do not work around it.
- **The scheduler is a singleton.** Two schedulers is untidy rather than
  dangerous — every task is idempotent — but it doubles the work.

## Not yet in place

Honest list, so nobody assumes coverage that does not exist:

- No metrics or tracing export. Structured logs only.
- No alerting. The queries above are manual.
- No automated backups or a tested restore drill — **the single most commonly
  skipped practice and the one that ends companies.**
- No OAuth provider; the streaming token store assumes the API writes
  `stream:token:<token>` on login.
- No read replica, no PgBouncer.
