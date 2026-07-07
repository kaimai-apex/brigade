# ConnectPro — Build Phases

A sequenced delivery plan. Each phase lists scope, deliverables, exit criteria, and the events/services introduced. Phases are cumulative — later phases assume everything before is live and stable.

> **Guiding principle:** ship a thin end-to-end vertical slice first (Phase 1–2 = MVP), then broaden. Every service arrives with its own CI pipeline, datastore, tests, and observability from day one.

---

## Phase 0 — Foundations (Platform & Tooling)

**Scope:** the ground everything is built on, before feature work.

**Deliverables**
- Monorepo (`apps/`, `services/`, `packages/`) with pnpm/Turbo workspaces.
- Shared NestJS library: config, logging, tracing, JWT validation, error envelope.
- Local dev via Docker Compose (Postgres, Redis, Kafka, OpenSearch, MongoDB).
- CI/CD skeleton: GitHub Actions (lint → test → build → containerize → deploy to staging).
- Base EKS cluster, namespaces, secrets management, ingress, TLS.
- Observability baseline: Prometheus, Grafana, ELK, OpenTelemetry/Jaeger wiring.

**Exit criteria**
- A "hello service" deploys through CI to staging and appears in Grafana/Jaeger.
- One command spins up the full local stack.

---

## Phase 1 — Identity & Profiles (MVP core)

**Scope:** users can sign up, authenticate, and build a profile. Web app shell exists.

**Services:** Auth, User. **Store:** PostgreSQL, Redis.

**Deliverables**
- Auth: signup, login, logout, refresh tokens, MFA (TOTP), password reset, OAuth stub.
- User: profile CRUD, experience, education, skills, certifications, completeness scoring.
- Next.js web app: auth flows, profile view/edit, responsive shell with Tailwind + Redux Toolkit.
- Kafka topic `user-created`; User service consumes it to bootstrap a profile.
- API Gateway with JWT validation and coarse RBAC.

**Exit criteria**
- New user: signup → login → complete profile → view own profile, end-to-end.
- p95 profile read < 200ms with Redis cache.
- Auth and User services fully covered by unit + integration tests.

---

## Phase 2 — Network & Content (completes MVP)

**Scope:** the social loop — connect, post, see a feed.

**Services:** Connection, Post, Feed. **Store:** PostgreSQL (connections), Cassandra (posts/feed), Redis.

**Deliverables**
- Connection: request/accept/reject/remove, follow/unfollow, followers/following.
- Post: create text/image posts, comments, likes, shares (media references via presigned URLs).
- Feed: fanout-on-write timelines, read-time ranking, Redis-cached home feed (TTL 5 min).
- Kafka: `connection-created`, `post-created`, `post-liked`, `comment-created`.
- Media service (basic): presigned S3 uploads + CloudFront delivery.
- Web: connections UI, post composer, home feed, engagement actions.

**Exit criteria (MVP complete)**
- User A connects with User B; A's post appears in B's ranked feed.
- Feed loads < 500ms p95 for a typical user.
- Fanout verified for small creators; large-creator path stubbed for Phase 4 tuning.

---

## Phase 3 — Realtime, Notifications & Search

**Scope:** communication and discoverability.

**Services:** Messaging, Notification, Search. **Store:** MongoDB, PostgreSQL, OpenSearch.

**Deliverables**
- Messaging: WebSocket/Socket.IO gateway, direct + group chat, presence, typing, read receipts, reactions, attachments; REST history.
- Notification: in-app + push (Firebase) + email (SendGrid) + SMS (Twilio); per-channel preferences; consumes `connection-created`, `post-liked`, `comment-created`, `message-sent`.
- Search: OpenSearch indexes for people, companies, posts; autocomplete, fuzzy, ranking; consumers index off Kafka topics.
- Web: chat UI, notification center, global search bar.

**Exit criteria**
- Two users exchange messages in real time with delivery + read receipts.
- A profile update is searchable within seconds (event-driven indexing).
- Notifications delivered across enabled channels per user preferences.

---

## Phase 4 — Jobs, Companies & Recommendations

**Scope:** the professional/economic layer.

**Services:** Job, Company, Recommendation. **Store:** PostgreSQL, feature store, Redis.

**Deliverables**
- Job: recruiter job CRUD, search/filter, apply, save, application tracking, applicant management, interview scheduling.
- Company: page CRUD, followers, company feed, job listings, page analytics.
- Recommendation (Python): people-you-may-know (graph + collaborative), recommended jobs, suggested companies, recommended content; served via Redis.
- Feed tuning: enable fanout-on-read for large creators; hybrid merge in production.
- Kafka: `job-created`, `job-applied`, `company-created`, `company-followed`.
- Web: jobs board, application flow, recruiter dashboard, company pages, recommendation modules.

**Exit criteria**
- A recruiter posts a job; a matching candidate sees it in recommendations and applies; recruiter sees the applicant in their pipeline.
- Recommendation endpoints fail open (core UX unaffected if they're down).
- Large-creator fanout verified under load without write hotspots.

---

## Phase 5 — Analytics, AI & Production Hardening

**Scope:** intelligence, scale, and launch readiness.

**Services:** Analytics, ML enhancements, Learning platform. **Store:** warehouse (Snowflake/BigQuery).

**Deliverables**
- Analytics pipeline: Kafka → Spark/Flink → warehouse → dashboards (page/profile/post views, engagement, applications).
- Learning platform: course catalog, video lectures, quizzes, certificates, progress tracking.
- AI features (roadmap): resume builder, job matching, post writer, interview coach — behind flags.
- Production hardening: load/chaos testing to scale targets, WAF, rate-limit tuning, encryption review, DR runbooks, autoscaling policies, SLO/alerting finalization.
- Admin portal: suspend/ban/verify, moderation queue, spam/abuse review, report management.

**Exit criteria**
- System sustains target load (peak-request drills) with SLOs met.
- Dashboards live; alerts firing on real thresholds; DR failover tested.
- Security review signed off before public launch.

---

## Cross-Phase Practices

- **Definition of Done (per feature):** code + tests + docs + metrics/traces + dashboard + runbook entry.
- **Event-first:** any state change other services care about publishes a Kafka event; consumers are idempotent.
- **Independent deployability:** no phase blocks another team's service deploys.
- **Feature flags:** new/risky features ship dark and are enabled progressively.
- **Backwards compatibility:** API changes are additive within `v1`; breaking changes go to `v2`.

---

## Phase → Module Traceability

| Phase | Modules delivered |
|---|---|
| 0 | Platform, CI/CD, observability, infra |
| 1 | Authentication, Profiles |
| 2 | Connections, Posts, Feed, Media (basic) |
| 3 | Messaging, Notifications, Search |
| 4 | Jobs, Companies, Recommendations, Feed (hybrid) |
| 5 | Analytics, Learning, AI, Admin, Hardening |
