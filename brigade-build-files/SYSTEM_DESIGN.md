# ConnectPro — System Design

---

## 1. Architecture Overview

ConnectPro follows a microservices, event-driven design. Requests flow through a CDN and load balancer to an API Gateway, which authenticates, rate-limits, and routes to domain services. Services own their own datastores and communicate synchronously via REST/gRPC for queries and asynchronously via Kafka for side effects.

```text
                         Internet
                            |
                     CDN (CloudFront)
                            |
                    Load Balancer (ALB)
                            |
                     API Gateway Layer
              (authN, authZ, rate limit, routing)
                            |
 ┌──────────┬──────────┬──────────┬──────────┬──────────────┐
Auth      User       Feed       Jobs       Messaging      Company
Service   Service    Service    Service     Service        Service
 │          │          │          │            │              │
 └──────────┴──────────┴──────────┴──────────┴──────────────┘
                            |
                     Event Bus (Kafka)
                            |
 ┌────────┬───────────┬──────────────┬────────┬────────┬──────┐
Search  Analytics  Notification    ML/Rec   Media    ETL
                            |
                        Data Layer
   (PostgreSQL · Cassandra · MongoDB · Redis · OpenSearch)
```

---

## 2. Request Flow (synchronous)

1. Client hits CDN → static assets served from edge; API calls pass through.
2. ALB terminates TLS, forwards to API Gateway.
3. Gateway validates JWT, checks rate limits, applies RBAC coarse-grained checks, routes by path (`/api/v1/<domain>/...`).
4. Target service validates fine-grained authorization, reads/writes its datastore, optionally reads Redis cache.
5. Service emits a Kafka event for any state change that others care about.
6. Response returned to client; downstream effects happen asynchronously.

---

## 3. Services

| Service | Responsibility | Primary store | Cache |
|---|---|---|---|
| Auth | Signup, login, JWT, OAuth, MFA, sessions | PostgreSQL | Redis (sessions) |
| User | Profiles, experience, education, skills | PostgreSQL | Redis (profile) |
| Connection | Requests, follows, degrees | PostgreSQL | Redis (graph) |
| Feed | Feed generation, ranking | Cassandra | Redis (feed) |
| Post | Posts, comments, likes, shares | Cassandra | Redis (trending) |
| Messaging | Realtime chat, presence, receipts | MongoDB | Redis (presence) |
| Job | Jobs, applications, recruiter workflows | PostgreSQL | Redis |
| Company | Company pages, followers, postings | PostgreSQL | Redis |
| Search | Global search, autocomplete | OpenSearch | — |
| Notification | Push, email, SMS, in-app | PostgreSQL + Kafka | Redis |
| Recommendation | People/jobs/content ranking | Feature store + models | Redis |
| Analytics | Event aggregation, dashboards | Warehouse | — |
| Media | Upload, scan, optimize, CDN | S3 | CloudFront |

Each service is stateless at the compute layer, packaged as a container, and scaled independently on EKS.

---

## 4. Event Bus (Kafka)

Kafka decouples producers from consumers. Every meaningful state change is published as an immutable event.

**Topics:**

```text
user-created          profile-updated        connection-created
post-created          post-liked             comment-created
job-created           job-applied            message-sent
notification-created  company-followed       course-completed
```

**Consumers by topic (examples):**

- `post-created` → Search (index), Feed (fanout), Analytics, Recommendation.
- `connection-created` → Feed (graph update), Notification, Recommendation.
- `job-applied` → Notification (recruiter alert), Analytics, ATS pipeline.
- `message-sent` → Notification, Analytics.

**Guarantees:** at-least-once delivery; consumers are idempotent keyed on event IDs. Partitioning by entity ID (e.g. `user_id`, `post_id`) preserves per-entity ordering.

---

## 5. Data Stores & Rationale

| Store | Used for | Why |
|---|---|---|
| PostgreSQL | Users, profiles, connections, jobs, companies | Strong consistency, relational integrity |
| Cassandra | Posts, feed timelines | Write-heavy, high fanout, horizontal scale |
| MongoDB | Messages, conversations | Flexible schema, high write throughput |
| Redis | Sessions, caches, presence, trending | Sub-ms reads, TTL support |
| OpenSearch | Search indexes | Full-text, fuzzy, ranking, facets |

---

## 6. Feed Generation (Hybrid Fanout)

**Fanout-on-write (small creators):** on post creation, push the post reference into each follower's precomputed timeline in Cassandra. Fast reads, cheap for small follower counts.

**Fanout-on-read (large creators / "celebrities"):** store the post once; at read time, merge the viewer's precomputed timeline with recent posts from high-follower accounts they follow. Avoids write amplification.

**Ranking:** timelines are re-ranked at read time using recency, affinity (connection strength), engagement signals, and content type. Redis caches the top-N ranked feed per user (TTL 5 min).

---

## 7. Caching Strategy

| Cache | TTL | Invalidation |
|---|---|---|
| User profile | 15 min | On `profile-updated` event |
| Home feed | 5 min | On new relevant `post-created` |
| Search results | 2 min | TTL only |
| Trending posts | 1 min | Recomputed on schedule |
| Session | token lifetime | On logout / revoke |

Cache-aside pattern: read cache → miss → read DB → populate cache. Writes update DB and publish an event; consumers invalidate.

---

## 8. Media Pipeline

```text
Upload → Virus Scan → Image/Video Optimization → Thumbnail Generation → S3 → CloudFront
```

Uploads go directly to S3 via presigned URLs. A Kafka event triggers async scanning and transcoding; the CDN serves finalized assets.

---

## 9. Security Architecture

- **AuthN:** JWT access tokens (short-lived) + refresh tokens (rotating, revocable); MFA via TOTP.
- **AuthZ:** RBAC enforced at gateway (coarse) and service (fine). Roles: `USER`, `RECRUITER`, `COMPANY_ADMIN`, `MODERATOR`, `SYSTEM_ADMIN`.
- **Edge:** WAF, rate limiting, CSRF/XSS protection, input validation.
- **Data:** encryption at rest (KMS) and in transit (TLS 1.2+); PII minimization; parameterized queries.
- **Secrets:** managed via secrets manager, never in code or images.

---

## 10. Observability

- **Metrics:** Prometheus + Grafana (CPU, memory, RPS, latency, error rate, Kafka lag).
- **Logs:** structured JSON → ELK stack.
- **Tracing:** OpenTelemetry instrumentation → Jaeger for distributed traces across services and Kafka.
- **Alerting:** SLO-based alerts on p95 latency, error rate, and consumer lag.

---

## 11. Infrastructure (AWS)

```text
EKS (Kubernetes)      — service orchestration
RDS PostgreSQL        — relational stores
ElastiCache Redis     — caching, sessions, presence
MSK (Kafka)           — event bus
S3 + CloudFront       — media storage + CDN
OpenSearch            — search
CloudWatch            — infra metrics/logs
```

---

## 12. CI/CD

```text
Developer → GitHub → GitHub Actions → Build → Test → Docker → Deploy → Kubernetes
```

Each service has its own pipeline: lint → unit → integration → container build → security scan → deploy to staging → smoke tests → progressive rollout to production.

---

## 13. Failure & Degradation

- Non-critical paths (recommendations, analytics) fail open — the core experience continues.
- Circuit breakers and timeouts on inter-service calls.
- Kafka buffers side effects during downstream outages; consumers catch up on recovery.
- Multi-AZ deployment; read replicas for Postgres; Cassandra/Mongo replication factor ≥ 3.
