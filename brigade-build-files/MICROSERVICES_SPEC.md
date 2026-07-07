# ConnectPro — Microservices Specification

Each service is independently deployable, owns its datastore, exposes a versioned API, and publishes/consumes Kafka events. Shared concerns (authN token validation, tracing, logging) come from a common NestJS library.

---

## Auth Service

**Responsibilities:** registration, login, social/OAuth login, MFA, JWT issuance/refresh, session revocation, password reset.

**Store:** PostgreSQL (`users`, `user_roles`, `refresh_tokens`, `oauth_accounts`) + Redis (session/blacklist).

**Publishes:** `user-created`, `user-suspended`, `user-banned`.

**Consumes:** —

**Key endpoints:** `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh-token`, `POST /auth/mfa/verify`, `POST /auth/password/reset`.

**Notes:** access tokens short-lived (~15 min); refresh tokens rotating and revocable; passwords hashed with Argon2/bcrypt.

---

## User Service

**Responsibilities:** profile CRUD, experience, education, skills, endorsements, certifications, resume/avatar references, completeness scoring, profile-view tracking.

**Store:** PostgreSQL + Redis (profile cache, TTL 15 min).

**Publishes:** `profile-updated`, `skill-added`.

**Consumes:** `user-created` (bootstrap profile).

**Key endpoints:** `GET /users/:id`, `PUT /users/:id`, `POST /users/:id/experience`, `POST /users/:id/skills`.

---

## Connection Service

**Responsibilities:** connection requests (send/accept/reject/remove), follow/unfollow, followers/following lists, degree-of-separation computation, mutual connections.

**Store:** PostgreSQL (`connections`, `follows`) + Redis (adjacency cache).

**Publishes:** `connection-created`, `connection-removed`, `user-followed`.

**Consumes:** `user-created`.

**Key endpoints:** `POST /connections/request`, `POST /connections/:id/accept`, `POST /connections/:id/reject`, `DELETE /connections/:id`, `POST /follows`.

---

## Post Service

**Responsibilities:** create/read posts, comments, likes, reposts, shares, saves; media references; poll handling.

**Store:** Cassandra (`posts_by_author`, `comments_by_post`, `likes_by_post`, `like_counts`).

**Publishes:** `post-created`, `post-liked`, `comment-created`, `post-shared`.

**Consumes:** —

**Key endpoints:** `POST /posts`, `GET /posts/:id`, `POST /posts/:id/comments`, `POST /posts/:id/likes`.

---

## Feed Service

**Responsibilities:** home-feed generation using hybrid fanout, ranking, trending, company updates.

**Store:** Cassandra (`home_timeline`) + Redis (ranked feed cache, TTL 5 min).

**Publishes:** —

**Consumes:** `post-created` (fanout), `connection-created` (graph update), `user-followed`.

**Key endpoints:** `GET /feed`, `GET /feed/trending`.

**Logic:** fanout-on-write for small creators; fanout-on-read merge for large creators; read-time re-ranking by recency, affinity, engagement.

---

## Messaging Service

**Responsibilities:** realtime 1:1 and group chat, presence, typing indicators, read receipts, reactions, attachments.

**Store:** MongoDB (`conversations`, `messages`) + Redis (presence, typing).

**Protocols:** WebSocket / Socket.IO gateway; REST for history.

**Publishes:** `message-sent`.

**Consumes:** —

**Key endpoints:** `GET /conversations`, `GET /conversations/:id/messages`, `POST /messages` (+ WS channels).

---

## Job Service

**Responsibilities:** job CRUD (recruiter), search/filter, apply, save, application tracking, applicant management, interview scheduling, candidate search.

**Store:** PostgreSQL (`jobs`, `applications`) + Redis.

**Publishes:** `job-created`, `job-applied`, `application-status-changed`.

**Consumes:** `profile-updated` (candidate search freshness).

**Key endpoints:** `GET /jobs`, `POST /jobs`, `POST /jobs/:id/apply`, `GET /jobs/:id/applicants`.

---

## Company Service

**Responsibilities:** company page CRUD, followers, company feed, job postings link, page analytics.

**Store:** PostgreSQL (`companies`, `company_followers`).

**Publishes:** `company-created`, `company-followed`.

**Consumes:** `job-created` (page listing).

**Key endpoints:** `POST /companies`, `GET /companies/:id`, `POST /companies/:id/follow`.

---

## Search Service

**Responsibilities:** global search across people, companies, jobs, posts, articles; autocomplete, fuzzy matching, ranking, faceted filters.

**Store:** OpenSearch (indexes: `people`, `companies`, `jobs`, `posts`, `articles`).

**Publishes:** —

**Consumes:** `profile-updated`, `company-created`, `job-created`, `post-created` (indexing).

**Key endpoints:** `GET /search?q=&type=`, `GET /search/autocomplete?q=`.

---

## Notification Service

**Responsibilities:** in-app, push, email, SMS notifications; per-user channel preferences; delivery tracking.

**Store:** PostgreSQL (`notifications`, `notification_preferences`) + Redis.

**Providers:** Firebase (push), SendGrid (email), Twilio (SMS).

**Publishes:** `notification-created`.

**Consumes:** `connection-created`, `post-liked`, `comment-created`, `job-applied`, `message-sent`.

**Key endpoints:** `GET /notifications`, `POST /notifications/:id/read`, `PUT /notifications/preferences`.

---

## Recommendation Service

**Responsibilities:** people you may know, recommended jobs, suggested companies, recommended content.

**Store:** feature store + model artifacts; Redis for served recommendations.

**Tech:** Python; collaborative filtering, content-based ranking, graph-based (mutual connections).

**Publishes:** —

**Consumes:** `connection-created`, `post-liked`, `job-applied`, `profile-updated`, `search-performed`.

**Key endpoints:** `GET /recommendations/people`, `GET /recommendations/jobs`, `GET /recommendations/content`.

---

## Analytics Service

**Responsibilities:** aggregate platform events (page/profile/post views, likes, applications) into a warehouse; power dashboards.

**Pipeline:** Kafka → Spark/Flink → warehouse (Snowflake/BigQuery) → dashboards.

**Consumes:** most Kafka topics (read-only).

---

## Media Service

**Responsibilities:** presigned upload URLs, virus scanning, image/video optimization, thumbnail generation, CDN delivery.

**Store:** S3 + CloudFront.

**Publishes:** `media-processed`.

**Consumes:** upload events.

---

## Cross-Cutting Contracts

- **Auth:** every service validates the JWT and enforces fine-grained RBAC.
- **Idempotency:** event consumers dedupe on event ID.
- **Versioning:** all HTTP routes under `/api/v1/...`.
- **Errors:** consistent problem+JSON envelope: `{ code, message, details, traceId }`.
- **Observability:** every service emits metrics, structured logs, and trace spans.
