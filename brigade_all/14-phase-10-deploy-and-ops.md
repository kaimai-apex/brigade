# 14 — Phase 10: Deployment & Operations

**Goal:** Brigade deploys reliably, scales on the right axes, and you find out about
problems before users tell you.

**Effort:** 2–3 weeks initial, then continuous
**Depends on:** Phase 0 (do the container work there), the rest is incremental

**Reference:** `Dockerfile`, `docker-compose.yml`, `Procfile`, `chart/` (Helm),
`.env.production.sample`, `config/sidekiq.yml`, `pghero` + `opentelemetry` gems

---

## Process topology

Three deployables, one Postgres, one Redis:

```
web        HTTP + API           scales on request rate
worker     background jobs      scales on queue depth
streaming  WebSockets           scales on connection count
```

Same image, different entrypoints — so a deploy ships one artifact. Different autoscaling
policies, because they saturate on different resources. Getting this shape right early
means scaling later is a config change, not a re-architecture.

Add a fourth when you need it: a **scheduler** process for cron-style jobs. Mastodon runs
this inside Sidekiq via `sidekiq-scheduler`, which is simpler and works until you need
scheduled jobs to survive a worker deploy.

---

## Environments

```
development   docker-compose, seeded with the demo graph from Phase 1
test          ephemeral, CI-only
staging       production-shaped, anonymized data subset
production
```

Staging must match production's *shape* — same Postgres major version, same Redis version,
same process split — even at a fraction of the size. A staging environment that differs
structurally tests nothing.

---

## Configuration

`.env.production.sample` in the reference documents every variable. Rules:

- All config via environment variables, never committed
- `.env.example` documents every variable with a description and safe default
- Secrets in a real secret manager (AWS Secrets Manager, Doppler, Vault) — not env files
  on disk
- **Fail loudly at boot** on a missing required variable. Never silently default a secret.
- Feature flags for anything risky, so a bad rollout is a toggle rather than a rollback

---

## Database operations

**Read replicas.** The reference uses `with_read_replica` for directory and search.
Introduce the seam in Phase 5 even with one database — retrofitting means auditing every
query for read-after-write dependencies.

Route to replicas: directory browse, search, public profiles, analytics.
Keep on primary: anything read immediately after a write in the same request.

**Connection pooling.** PgBouncer in transaction mode. Rails/Node connection pools
multiply by process count and will exhaust `max_connections` faster than you expect.

**Migration safety** (from Phase 0): `CONCURRENTLY` indexes, no long locks, backfills as
background jobs, expand-migrate-contract for renames.

**Backups.** Automated daily, plus point-in-time recovery. **And a quarterly restore
drill.** An untested backup is not a backup — this is the single most commonly skipped
operational practice and the one that ends companies.

**`pghero`** or equivalent for query performance. Slow query log on from day one.

---

## Caching layers

```
CDN            static assets, anonymous directory/profile pages (Phase 5)
Redis          feeds (Phase 4), sessions, rate limits, fragment cache
Application    memoization within a request
```

Cache invalidation rules to write down now:

- Profile edit → invalidate profile cache, enqueue reindex, recompute completeness
- Post create → fan-out (Phase 4), invalidate relevant tag/company feed caches
- Connection change → invalidate relationship cache, enqueue feed merge, mark degrees stale
- Verification change → invalidate profile cache and directory ranking

The one to watch: `cache_if_unauthenticated!` on the directory means the CDN holds
anonymous responses. Profile edits must purge those, or a suspended scammer stays visible
in Google's cache and yours.

---

## Observability

Instrument these from the start, not after the first incident.

**Metrics**
```
HTTP:      request rate, p50/p95/p99 latency, error rate — per endpoint
Queues:    depth per queue, job latency, failure rate, retry rate
Database:  connection pool utilization, slow queries, replication lag
Redis:     memory, hit rate, pub/sub throughput
Streaming: connection count, publish rate, reconnect rate
```

**Business metrics matter as much as technical ones**, and nobody instruments them early:
```
signups, onboarding completion rate, profile completeness distribution,
connection requests sent/accepted, directory searches, verification
completion rate, reports filed, moderation queue depth and time-to-action
```

Onboarding completion and verification completion are your two leading indicators. If you
only instrument two things, make it those.

**Tracing.** The reference includes `opentelemetry-api`. Adopt OTel — vendor-neutral, and
distributed tracing across web → worker → streaming is the only practical way to debug a
slow request that crosses process boundaries.

**Logging.** Structured JSON, with a request ID propagated through jobs. Never log PII,
tokens, or full request bodies. For a platform holding employment history, log hygiene is
a compliance matter, not a preference.

**Alerting.** Alert on symptoms users feel, not causes:
```
p95 latency > 1s for 5 min
error rate > 1%
any queue depth > 10k or job latency > 5 min
replication lag > 30s
moderation queue unactioned > 24h    ← genuinely important
verification queue backing up
```

Every alert must be actionable. An alert nobody acts on trains everyone to ignore alerts.

---

## Security

- HTTPS everywhere, HSTS, secure cookie flags
- CSP headers — a professional network rendering user content is an XSS target
- Dependency scanning in CI (Dependabot / Snyk) plus the license scan from Phase 0
- Rate limiting at the edge as well as in-app (Phase 3)
- Secrets rotation procedure, written down
- **Encryption at rest** on the database. You hold employment history, education, and
  contact details for real people.
- 2FA available for all users; **required** for moderators and admins
- Audit logging on all admin actions (Phase 8)
- Consider a penetration test before any enterprise sales motion — procurement will ask

---

## Cost awareness

Roughly, as scale arrives:

| Component | Driver |
|---|---|
| Postgres | Profile and post volume; replicas for read scaling |
| Redis | Feed storage — `MAX_ITEMS` × active users. Bounded by design (Phase 4) |
| Workers | Fan-out volume; scales with connection graph density |
| Media | Avatars, attachments, PDFs. Use object storage + CDN, never local disk |
| Search | Elasticsearch is the step-change cost. Delay it (Phase 5) |

`MAX_ITEMS = 800` is what keeps Redis costs predictable. Resist raising it.

---

## Exit criteria

- [ ] Three-process topology deployed, independently scalable
- [ ] Staging matches production's shape
- [ ] All config via environment; missing required vars fail at boot
- [ ] Secrets in a secret manager
- [ ] Read replica routing seam in place
- [ ] PgBouncer configured
- [ ] Automated backups **with a completed restore drill**
- [ ] CDN caching anonymous directory and profile pages, with invalidation on edit
- [ ] Metrics, tracing, and structured logging live — technical *and* business metrics
- [ ] Alerting on symptoms, every alert actionable
- [ ] Encryption at rest; 2FA enforced for admins; dependency and license scanning in CI
- [ ] Runbook for the top 5 failure modes
