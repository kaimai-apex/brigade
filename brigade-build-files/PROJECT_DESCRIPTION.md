# ConnectPro — Project Description

**Enterprise-scale professional networking platform inspired by LinkedIn.**

---

## 1. Overview

ConnectPro is a cloud-native, event-driven professional networking platform built on a microservices architecture. It enables professionals to build identities, grow networks, publish content, discover jobs, recruit talent, communicate in real time, and learn — at a scale of tens of millions of users.

This document is the top-level product and engineering brief. Detailed technical documents:

| Document | Purpose |
|---|---|
| `SYSTEM_DESIGN.md` | High-level architecture, data flows, scaling |
| `MICROSERVICES_SPEC.md` | Per-service responsibilities, contracts, data ownership |
| `DATABASE_SCHEMA.md` | Table definitions, indexes, partitioning |
| `API_SPEC.md` | REST/WebSocket endpoint contracts |
| `BUILD_PHASES.md` | Sequenced delivery plan with acceptance criteria |
| `CURSOR_IMPLEMENTATION_PLAN.md` | Task-level implementation checklist |

---

## 2. Goals

- **Professional identity** — rich profiles: experience, education, skills, certifications, portfolio, resume.
- **Networking** — connection requests, follows, degrees of separation, mutual-connection insights.
- **Content** — text/image/video/document/poll posts, comments, reactions, reposts, articles.
- **Feed** — personalized, ranked home feed using a hybrid fanout strategy.
- **Jobs & recruiting** — job discovery, applications, applicant tracking, candidate search.
- **Company pages** — branded pages, followers, updates, job postings, analytics.
- **Messaging** — real-time 1:1 and group chat with presence, receipts, reactions, attachments.
- **Search** — people, companies, jobs, posts, skills, and articles via full-text search.
- **Recommendations** — people you may know, jobs, companies, and content.
- **Learning** — courses, video lectures, certifications, progress tracking.
- **Notifications** — in-app, push, email, and SMS.
- **Trust & safety** — moderation, spam/abuse detection, verification, admin controls.

---

## 3. Personas & Roles

| Persona | Primary needs | RBAC role |
|---|---|---|
| Professional | Build profile, network, post, apply to jobs | `USER` |
| Recruiter | Post jobs, search candidates, manage pipeline | `RECRUITER` |
| Company Admin | Manage company page, analytics, postings | `COMPANY_ADMIN` |
| Moderator | Review reports, moderate content | `MODERATOR` |
| System Admin | Platform config, user lifecycle, verification | `SYSTEM_ADMIN` |

Roles are enforced at the API Gateway and re-validated inside each service. A user may hold multiple roles (e.g. a Professional who is also a Recruiter).

---

## 4. Core Capabilities by Module

**Authentication** — email/password signup, social login (OAuth), MFA (TOTP), JWT access + refresh tokens, password reset, session revocation.

**Profiles** — basic info, about, experience, education, certifications, skills, languages, portfolio, resume upload, profile completeness scoring, profile-view tracking.

**Connections** — send/accept/reject/remove requests, follow/unfollow, followers/following lists, 1st/2nd/3rd-degree computation.

**Feed & Posts** — create posts with media/polls, like/comment/repost/share/save, ranked home feed, trending, company updates.

**Messaging** — direct and group messages, typing indicators, read receipts, reactions, file attachments, presence.

**Jobs** — search, filter, apply, save, track applications; recruiter job CRUD, applicant management, interview scheduling, candidate search.

**Companies** — page creation, feed, followers, job postings, page analytics.

**Notifications** — real-time in-app plus push/email/SMS with per-channel user preferences.

**Search** — autocomplete, fuzzy matching, ranking, faceted filters across all entity types.

**Recommendations** — collaborative filtering, content-based ranking, graph-based (mutual connections) suggestions.

**Learning** — course catalog, video lectures, quizzes, certificates, progress tracking.

**Admin** — suspend/ban users, verification, content moderation queue, spam/abuse review, report management.

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Availability | 99.95% target; multi-AZ; graceful degradation of non-critical paths |
| Scalability | Horizontal, stateless services; independent per-service scaling |
| Performance | p95 API latency < 200ms for reads; feed load < 500ms |
| Consistency | Strong within a service's DB; eventual across services via Kafka |
| Security | JWT + refresh, MFA, RBAC, encryption at rest/in transit, WAF, rate limiting |
| Observability | Metrics (Prometheus/Grafana), logs (ELK), tracing (OpenTelemetry/Jaeger) |
| Deployment | Cloud-native on AWS EKS (Kubernetes), GitHub Actions CI/CD |
| Data privacy | GDPR-style data export/delete, soft deletes, PII minimization |

---

## 6. Scale Targets

| Metric | Target |
|---|---|
| Registered users | 100 million |
| Daily active users | 20 million |
| Peak requests | 500,000 req/s |
| Messages | 50 million/day |
| Posts | 10 million/day |

---

## 7. Technology Summary

**Frontend:** Next.js, React, TypeScript, Redux Toolkit, TailwindCSS; React Native (mobile).
**Backend:** Node.js + NestJS (primary); Python for ML/recommendations.
**Data:** PostgreSQL, Cassandra, MongoDB, Redis, OpenSearch/Elasticsearch.
**Streaming:** Apache Kafka (MSK).
**Infra:** AWS (EKS, RDS, ElastiCache, MSK, S3, CloudFront, OpenSearch, CloudWatch).
**Media:** S3 + CloudFront, virus scan, image optimization, thumbnailing.

---

## 8. Success Criteria

- MVP (Phases 1–2) supports signup → profile → connect → post → feed → message end-to-end.
- Each service independently deployable with its own CI pipeline and datastore.
- Event-driven side effects (search indexing, notifications, analytics) fully decoupled via Kafka.
- Observability dashboards live before production launch.
- Security controls (RBAC, rate limiting, encryption) validated by review before Phase 5.
