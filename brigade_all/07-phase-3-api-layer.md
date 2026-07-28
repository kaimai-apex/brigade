# 07 — Phase 3: API Layer

**Goal:** Brigade has a versioned, OAuth-secured, rate-limited REST API that the web
client consumes like any third-party would. No private backdoor endpoints.

**Effort:** 2–3 weeks solo
**Depends on:** Phase 2
**Blocks:** Phase 6 (frontend), Phase 7 (streaming)

**Reference:** `app/controllers/api/` (v1 = 36 controllers, plus v2, v1_alpha, web),
`app/serializers/` (144), `doorkeeper` + `rack-attack` gems

---

## The principle worth copying

Mastodon's own web client is an OAuth application against its own public API. There is no
privileged internal path. This is why a rich third-party app ecosystem exists at all — the
API can't rot, because the first-party client breaks the moment it does.

The cost is real: you can't take shortcuts for your own frontend. The benefit is that your
API is always production-quality, and a mobile app or an ATS integration is a client, not
a project.

**For Brigade specifically:** employers will want ATS integration (Greenhouse, Lever,
Workday). Recruiters will want data export. If the API is an afterthought, each of those
is a bespoke build. If it's the only path, each is a permission scope.

One pragmatic concession — Mastodon keeps `api/web/` for genuinely client-specific
endpoints (push subscriptions, embeds). Use the same escape hatch, sparingly, and make it
obvious in the path.

---

## Versioning

```
/api/v1/...        stable
/api/v2/...        replacements for v1 endpoints that needed breaking changes
/api/v1_alpha/...  unstable, no compatibility promise
/api/web/...       first-party client only
```

Mastodon does not version the whole API at once. `v2` exists only for the handful of
endpoints where `v1`'s shape was wrong (search, filters, instance, notifications). `v1`
keeps working forever. That's the right model — bumping an entire API version because one
endpoint changed forces every client to migrate for no reason.

Rule: **never break a shipped endpoint.** Add `v2/that_endpoint` and keep `v1` alive.

---

## Endpoint surface

Mapped from Mastodon's `api/v1` controllers, adapted per `03-concept-mapping.md`.

### Identity & profiles
```
POST   /api/v1/apps                       register an OAuth client
GET    /api/v1/profiles/verify_credentials
PATCH  /api/v1/profiles/update_credentials
GET    /api/v1/profiles/:id
GET    /api/v1/profiles/:id/posts
GET    /api/v1/profiles/:id/connections
GET    /api/v1/profiles/:id/followers
GET    /api/v1/profiles/relationships     ← batch. See note below
GET    /api/v1/profiles/:id/experiences
GET    /api/v1/profiles/:id/endorsements
POST   /api/v1/profiles/:id/note          private annotation
```

**`/relationships` is the important one.** Given N profile IDs, it returns your
relationship to each — connected, pending, following, blocked, muted. Without it, a
directory page showing 30 profiles fires 30 requests to decide which button to render.
Mastodon learned this early; build it in from the start.

### Graph
```
POST   /api/v1/profiles/:id/connect
POST   /api/v1/profiles/:id/disconnect
GET    /api/v1/connection_requests
POST   /api/v1/connection_requests/:id/authorize
POST   /api/v1/connection_requests/:id/reject
POST   /api/v1/profiles/:id/{follow,unfollow,block,unblock,mute,unmute}
```

### Content & timelines
```
POST   /api/v1/posts
GET    /api/v1/posts/:id
GET    /api/v1/posts/:id/context          ancestors + descendants in one call
PUT    /api/v1/posts/:id
DELETE /api/v1/posts/:id
POST   /api/v1/posts/:id/{react,unreact,reshare,bookmark}
GET    /api/v1/timelines/home
GET    /api/v1/timelines/public
GET    /api/v1/timelines/tag/:tag
GET    /api/v1/timelines/list/:id
POST   /api/v1/media
GET    /api/v1/markers                    read position sync
```

### Discovery — Brigade's core
```
GET    /api/v1/directory                  ← Phase 5
GET    /api/v2/search                     profiles, companies, jobs, posts
GET    /api/v1/suggestions                who to connect with
GET    /api/v1/trends/{skills,topics,links}
GET    /api/v1/companies/:id
GET    /api/v1/companies/:id/people
```

### Brigade-native
```
GET    /api/v1/jobs                       filterable
POST   /api/v1/jobs
POST   /api/v1/jobs/:id/apply
GET    /api/v1/applications
GET    /api/v1/talent_pools
POST   /api/v1/talent_pools/:id/items
POST   /api/v1/endorsements
POST   /api/v1/recommendations
GET    /api/v1/profile_views              "who viewed your profile"
POST   /api/v1/intro_requests
```

### Notifications, moderation, account
```
GET    /api/v1/notifications
POST   /api/v1/notifications/:id/dismiss
GET    /api/v1/conversations
POST   /api/v1/reports
GET    /api/v1/filters
GET    /api/v1/blocks  /mutes
POST   /api/v1/exports                    data portability
```

---

## Authentication: OAuth2

Use a real OAuth2 provider (Doorkeeper on Rails; Ory Hydra or `node-oauth2-server` on
Node). Do not hand-roll it.

Grant types: authorization code + PKCE for the web and mobile clients, client credentials
for server-to-server integrations.

### Scopes

Mastodon uses `read`/`write`/`follow` with colon-separated sub-scopes (`read:notifications`).
Brigade's:

```
read           read:profile  read:connections  read:notifications
               read:jobs  read:applications  read:messages
write          write:profile  write:posts  write:connections  write:applications
recruiter      recruiter:search  recruiter:pools  recruiter:contact
admin          admin:read  admin:write
```

`recruiter:*` as a distinct scope family is deliberate — it's how you sell tiered API
access to employers and ATS vendors later without redesigning auth.

---

## Serializers

144 in the reference repo, and the reason API responses are consistent.

```ts
class ProfileSerializer {
  serialize(profile, viewer) {
    // one place where profile JSON shape is decided
  }
}
```

Rules:

1. **One serializer per resource.** Every endpoint returning a Profile uses
   `ProfileSerializer`. No exceptions, no inline shaping.
2. **Serializers never query.** They receive preloaded data. This is the N+1 defense, and
   it should be enforced by the Phase 0 architecture check.
3. **Visibility is a parameter, not a branch.** Pass the viewer; the serializer applies
   field-level rules (contact info gated by connection degree) via the policy.
4. **Nesting is explicit.** `ProfileSerializer` includes `ProfileStatsSerializer`; it does
   not inline the fields.

### Field-level visibility

Brigade needs this more than Mastodon does. Same profile, three viewers, three shapes:

| Field | Anonymous | 2nd degree | Connected |
|---|---|---|---|
| display_name, headline | ✅ | ✅ | ✅ |
| full experience history | partial | ✅ | ✅ |
| email, phone | ❌ | ❌ | ✅ |
| open_to_work | ❌ | ❌ | ✅ (if scoped) |

Implement this **once**, in the serializer, delegating to the policy. If it's implemented
per-endpoint, one endpoint will get it wrong and leak.

---

## Pagination

Mastodon uses `kaminari` with **cursor pagination via `Link` headers**, not offsets:

```
Link: <https://brigade.com/api/v1/timelines/home?max_id=1234>; rel="next",
      <https://brigade.com/api/v1/timelines/home?min_id=5678>; rel="prev"
```

Offset pagination on a feed produces duplicates and skips as new items arrive, and
`OFFSET 10000` is a sequential scan. Use `max_id`/`min_id`/`since_id` cursors on IDs
everywhere.

For the directory (Phase 5), the reference `directories_controller.rb` uses `offset` —
because directory results are ordered by activity, not ID, and are cached. Offsets are
acceptable for bounded, cached, non-realtime result sets. Everything else: cursors.

---

## Rate limiting

`rack-attack` in the reference. Brigade needs it more, because a professional network is a
scraping target — the profile data *is* the asset.

```
Per authenticated user:     300 req / 5 min
Per IP, unauthenticated:    100 req / 5 min
POST /api/v1/posts:          30 / 30 min
POST connection requests:    50 / day        ← anti-spam
GET  /api/v1/directory:     100 / 5 min     ← anti-scraping
GET  /api/v1/profiles/:id:  200 / 5 min     ← anti-scraping
Sign-up per IP:               5 / day
Password reset:              5 / hour
```

Return `X-RateLimit-Limit`, `-Remaining`, `-Reset` headers so clients can back off
gracefully.

**Scraping deserves its own attention.** Rate limits are necessary but not sufficient.
Also: require auth for full profile data, watermark/vary field ordering, monitor for
sequential ID enumeration, and use non-sequential public IDs. Mastodon doesn't do much
here because its data is intentionally public. Brigade's isn't.

---

## Errors

One shape, everywhere:

```json
{ "error": "Record not found",
  "error_description": "No profile with that ID",
  "details": { "field": ["specific message"] } }
```

Status codes: 401 unauthenticated, 403 unauthorized, 404 not found, 422 validation,
429 rate limited, 503 maintenance.

Never leak internals in `error`. Log the stack trace with a request ID; return the ID to
the client so support can correlate.

---

## Exit criteria

- [ ] All endpoints above implemented and documented (OpenAPI spec generated from code)
- [ ] OAuth2 provider live; the web client authenticates as an OAuth app
- [ ] Scopes enforced per endpoint, including `recruiter:*`
- [ ] One serializer per resource; architecture check confirms serializers don't query
- [ ] Field-level visibility implemented once, tested at all three viewer levels
- [ ] Cursor pagination with `Link` headers on all collections
- [ ] Rate limiting live with correct headers; load-tested
- [ ] Consistent error shape, verified by contract tests
- [ ] `/api/v1/profiles/relationships` batch endpoint exists and the directory uses it
- [ ] Zero endpoints bypass the API for the first-party client, except a documented
      `api/web/` allowlist
