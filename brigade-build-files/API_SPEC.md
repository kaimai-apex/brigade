# ConnectPro — API Specification

**Base URL:** `https://api.connectpro.com`
**Versioning:** all routes prefixed `/api/v1`.
**Auth:** `Authorization: Bearer <access_token>` on all non-public routes.
**Content type:** `application/json` unless noted.

**Standard error envelope:**
```json
{ "code": "string", "message": "string", "details": {}, "traceId": "string" }
```

**Pagination (list endpoints):** `?limit=20&cursor=<opaque>` → `{ "data": [...], "nextCursor": "..." }`.

---

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | public | Register a new user |
| POST | `/api/v1/auth/login` | public | Email/password login |
| POST | `/api/v1/auth/logout` | user | Revoke current session |
| POST | `/api/v1/auth/refresh-token` | public | Exchange refresh for new access token |
| POST | `/api/v1/auth/mfa/verify` | user | Verify TOTP code |
| POST | `/api/v1/auth/password/reset` | public | Request password reset |
| POST | `/api/v1/auth/oauth/:provider` | public | Social/OAuth login |

**Example — signup**
```http
POST /api/v1/auth/signup
{ "email": "a@b.com", "password": "•••", "firstName": "Ada", "lastName": "Lovelace" }
→ 201 { "userId": "uuid", "accessToken": "...", "refreshToken": "..." }
```

---

## Users / Profiles

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/users/:id` | user | Get profile |
| PUT | `/api/v1/users/:id` | owner | Update profile |
| DELETE | `/api/v1/users/:id` | owner/admin | Soft-delete account |
| POST | `/api/v1/users/:id/experience` | owner | Add experience |
| POST | `/api/v1/users/:id/education` | owner | Add education |
| POST | `/api/v1/users/:id/skills` | owner | Add skill |
| POST | `/api/v1/users/:id/skills/:skillId/endorse` | user | Endorse a skill |

---

## Connections

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/connections/request` | user | Send connection request |
| POST | `/api/v1/connections/:id/accept` | receiver | Accept request |
| POST | `/api/v1/connections/:id/reject` | receiver | Reject request |
| DELETE | `/api/v1/connections/:id` | user | Remove connection |
| GET | `/api/v1/connections` | user | List connections |
| POST | `/api/v1/follows` | user | Follow a user |
| DELETE | `/api/v1/follows/:userId` | user | Unfollow |

---

## Posts & Engagement

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/posts` | user | Create post |
| GET | `/api/v1/posts/:id` | user | Get post |
| DELETE | `/api/v1/posts/:id` | owner | Delete post |
| POST | `/api/v1/posts/:id/comments` | user | Comment |
| POST | `/api/v1/posts/:id/likes` | user | Like |
| DELETE | `/api/v1/posts/:id/likes` | user | Unlike |
| POST | `/api/v1/posts/:id/share` | user | Repost/share |

---

## Feed

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/feed` | user | Personalized home feed |
| GET | `/api/v1/feed/trending` | user | Trending posts |

---

## Jobs

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/jobs` | user | Search/list jobs (filters: `q`, `location`, `type`) |
| POST | `/api/v1/jobs` | recruiter | Create job |
| GET | `/api/v1/jobs/:id` | user | Get job |
| PUT | `/api/v1/jobs/:id` | recruiter | Update job |
| POST | `/api/v1/jobs/:id/apply` | user | Apply |
| POST | `/api/v1/jobs/:id/save` | user | Save job |
| GET | `/api/v1/jobs/:id/applicants` | recruiter | List applicants |
| PUT | `/api/v1/applications/:id/status` | recruiter | Update application status |

---

## Companies

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/companies` | company_admin | Create company page |
| GET | `/api/v1/companies/:id` | user | Get company page |
| PUT | `/api/v1/companies/:id` | company_admin | Update page |
| POST | `/api/v1/companies/:id/follow` | user | Follow company |
| GET | `/api/v1/companies/:id/analytics` | company_admin | Page analytics |

---

## Messaging

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/conversations` | user | List conversations |
| POST | `/api/v1/conversations` | user | Start conversation (direct/group) |
| GET | `/api/v1/conversations/:id/messages` | participant | Message history |
| POST | `/api/v1/messages` | participant | Send message |
| POST | `/api/v1/messages/:id/reactions` | participant | React |

**WebSocket** `wss://api.connectpro.com/ws` — events: `message:new`, `typing`, `presence`, `receipt:read`.

---

## Search

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/search` | user | `?q=&type=people\|companies\|jobs\|posts\|articles` |
| GET | `/api/v1/search/autocomplete` | user | `?q=` prefix suggestions |

---

## Recommendations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/recommendations/people` | user | People you may know |
| GET | `/api/v1/recommendations/jobs` | user | Recommended jobs |
| GET | `/api/v1/recommendations/content` | user | Recommended content |

---

## Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/notifications` | user | List notifications |
| POST | `/api/v1/notifications/:id/read` | user | Mark read |
| PUT | `/api/v1/notifications/preferences` | user | Update channel preferences |

---

## Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/admin/users/:id/suspend` | admin | Suspend user |
| POST | `/api/v1/admin/users/:id/ban` | admin | Ban user |
| POST | `/api/v1/admin/users/:id/verify` | admin | Verify user |
| GET | `/api/v1/admin/reports` | moderator | Moderation queue |
| POST | `/api/v1/admin/reports/:id/resolve` | moderator | Resolve report |

---

## Rate Limits

- Default: 100 req/min per user for reads, 30 req/min for writes.
- Auth endpoints: stricter limits + progressive backoff on failed logins.
- Limits enforced at the API Gateway; responses include `X-RateLimit-*` headers and `429` on breach.
