# ConnectPro — Cursor Implementation Plan

Task-level checklist for building ConnectPro, aligned to `BUILD_PHASES.md`. Intended to be worked top-to-bottom in an AI-assisted editor. Check items off as they land in `main`.

---

## Phase 0 — Foundations

- [ ] Initialize monorepo (pnpm + Turborepo): `apps/`, `services/`, `packages/`.
- [ ] `packages/common`: config loader, logger, tracing, JWT guard, error envelope, Kafka client.
- [ ] `docker-compose.yml`: Postgres, Redis, Kafka + Zookeeper, MongoDB, OpenSearch.
- [ ] GitHub Actions: reusable workflow (lint → test → build → docker → deploy).
- [ ] Terraform/Helm: EKS cluster, namespaces, ingress, TLS, secrets.
- [ ] Observability: Prometheus scrape configs, Grafana dashboards, ELK, OTel collector → Jaeger.
- [ ] Scaffold a `hello-service` and deploy it through CI to staging as a smoke test.

## Phase 1 — Auth & User

- [ ] `services/auth-service` (NestJS + PostgreSQL): entities `users`, `user_roles`, `refresh_tokens`, `oauth_accounts`.
- [ ] Endpoints: signup, login, logout, refresh-token, mfa/verify, password/reset, oauth/:provider.
- [ ] Argon2/bcrypt hashing; rotating refresh tokens; Redis session/blacklist.
- [ ] Publish `user-created`.
- [ ] `services/user-service` (NestJS + PostgreSQL): `profiles`, `experience`, `education`, `skills`, `user_skills`, `certifications`.
- [ ] Consume `user-created` → bootstrap profile; publish `profile-updated`.
- [ ] Redis profile cache (TTL 15 min); completeness scoring.
- [ ] `apps/web` (Next.js + TS + Redux Toolkit + Tailwind): auth flows, profile view/edit, app shell.
- [ ] API Gateway: JWT validation, coarse RBAC, `/api/v1` routing, rate limiting.
- [ ] Tests: unit + integration for auth and user; e2e signup→profile.

## Phase 2 — Connections, Posts, Feed

- [ ] `services/connection-service` (PostgreSQL): `connections`, `follows`; request/accept/reject/remove, follow/unfollow.
- [ ] Publish `connection-created`, `user-followed`.
- [ ] `services/post-service` (Cassandra): `posts_by_author`, `comments_by_post`, `likes_by_post`, `like_counts`.
- [ ] Publish `post-created`, `post-liked`, `comment-created`.
- [ ] `services/feed-service` (Cassandra + Redis): `home_timeline`; consume `post-created`/`connection-created`; fanout-on-write; read-time ranking; cache TTL 5 min.
- [ ] `services/media-service`: presigned S3 uploads + CloudFront delivery.
- [ ] Web: connections UI, post composer (text/image), home feed, like/comment/share.
- [ ] e2e: A connects B → A posts → post in B's feed.

## Phase 3 — Messaging, Notifications, Search

- [ ] `services/messaging-service` (MongoDB): `conversations`, `messages`; WebSocket/Socket.IO gateway; presence, typing, receipts, reactions, attachments.
- [ ] Publish `message-sent`.
- [ ] `services/notification-service` (PostgreSQL): `notifications`, `notification_preferences`; Firebase/SendGrid/Twilio; consume `connection-created`, `post-liked`, `comment-created`, `message-sent`.
- [ ] `services/search-service` (OpenSearch): indexes people/companies/posts; autocomplete, fuzzy, ranking; consumers index off Kafka.
- [ ] Web: chat UI, notification center, global search.
- [ ] e2e: realtime message with receipts; profile update becomes searchable.

## Phase 4 — Jobs, Companies, Recommendations

- [ ] `services/job-service` (PostgreSQL): `jobs`, `applications`; recruiter CRUD, search/filter, apply/save, applicant management, interview scheduling.
- [ ] Publish `job-created`, `job-applied`, `application-status-changed`.
- [ ] `services/company-service` (PostgreSQL): `companies`, `company_followers`; pages, followers, feed, analytics.
- [ ] `services/recommendation-service` (Python): PYMK (graph + collaborative), job/company/content recs; serve via Redis; consume relevant events.
- [ ] Feed: enable fanout-on-read for large creators; hybrid merge.
- [ ] Web: jobs board, application flow, recruiter dashboard, company pages, recommendation modules.
- [ ] e2e: recruiter posts job → candidate gets rec → applies → appears in pipeline.

## Phase 5 — Analytics, AI, Hardening

- [ ] `services/analytics-service`: Kafka → Spark/Flink → warehouse (Snowflake/BigQuery) → dashboards.
- [ ] Learning platform: courses, lectures, quizzes, certificates, progress tracking.
- [ ] AI features behind flags: resume builder, job matching, post writer, interview coach.
- [ ] Admin portal: suspend/ban/verify, moderation queue, spam/abuse review, reports.
- [ ] Hardening: load + chaos tests to scale targets, WAF, rate-limit tuning, encryption review, DR runbooks, autoscaling, SLO/alerting.
- [ ] Security review sign-off before launch.

---

## Working Conventions

- One service = one PR series; keep services independently deployable.
- Event consumers idempotent (dedupe on event ID).
- Every feature ships with tests, metrics, traces, and a runbook entry.
- API changes additive within `v1`; breaking changes → `v2`.
