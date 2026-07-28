# Brigade — Architecture

**Status:** Phase 0 (foundations) and Phase 1 (data model) landed. Phases 2–10
in progress. Plan documents live in [`brigade_all/`](../brigade_all/).

---

## Provenance statement

Brigade's backend architecture is **inspired by Mastodon's published
architecture**. Mastodon is one of the few readable, production-proven social
platforms in existence, and its layering — service objects, precomputed feeds,
weighted background queues, an API-first design, a User/Account split — is worth
learning from.

**No Mastodon code is used in Brigade.** Not a file, not a function, not a
stylesheet. What is adopted is architecture, layer naming, and design
decisions, none of which are copyrightable; the implementations here are
original.

This matters because Mastodon is licensed **AGPL-3.0**, whose Section 13
network clause would require Brigade to offer its complete server-side source to
every visitor if Brigade were a derivative work. It is not.

The hygiene rules that keep it that way, and which apply to every contributor
including contractors:

1. **Never copy-paste from an AGPL/GPL source.** Not one function, not "just
   this one utility."
2. Any Mastodon checkout stays **outside this repository** and out of the
   dependency tree — never a submodule, never vendored.
3. `pnpm check:licenses` runs in CI and fails the build on any GPL-family or
   source-available license in the dependency tree.
4. This statement is kept accurate. If it ever stops being true, say so here
   first.

> Not legal advice. A licensing lawyer should confirm this posture — it is a
> cheap question with an expensive wrong answer.

---

## Decision record

```
DECISION 1 — License posture
  Chosen:        Port (architecture only, original implementation)
  Decided by:    ____________________
  Date:          ____________________
  Lawyer review: [ ] Yes — name/date ______  [ ] Not yet
  Rationale:     AGPL contamination of the core would materially damage the
                 IP assignment, enterprise sales, and any future diligence.
                 Architecture is not copyrightable; source is.

DECISION 2 — Stack
  Chosen:        Keep current (TypeScript, Next.js on Vercel, Postgres)
  Decided by:    ____________________
  Date:          ____________________
  Rationale:     Existing landing, directory, onboarding and auth survive.
                 Rails would map 1:1 to the reference but discards working code
                 and adds a language to learn mid-build.

DECISION 3 — Federation (ActivityPub)
  Chosen:        Deferred indefinitely
  Rationale:     Roughly a third of the reference's complexity, solving a
                 problem Brigade does not have. The architecture leaves room to
                 add it without a rewrite; nobody's blocker to using a
                 professional network is that it doesn't federate.

OPEN — Postgres host (RDS vs. managed), read-replica timing, Elasticsearch.
       All deliberately deferred; Postgres carries six figures of profiles.
```

---

## Layers

The reference layout is a Rails tree. Brigade is a pnpm monorepo, so the layers
map like this:

| Layer | Lives in | Rule |
|---|---|---|
| Controllers | `apps/web/src/app/api/**`, server actions | Authenticate → authorize via a policy → call **one** service → render **one** serializer. No business logic, no writes. |
| Services | `packages/core/src/services/` | **All writes.** `VerbNounService`, one public `call`, owns its transaction, enqueues side effects. |
| Workers | `packages/core/src/workers/` | A retry envelope around a service. No business logic. Idempotent, takes IDs. |
| Policies | `packages/core/src/policies/` | One per resource, one method per action, returns a boolean. |
| Serializers | `packages/core/src/serializers/` | The only place API response shape is decided. **Never queries.** |
| Models | `packages/core/src/models/` | Rows and domain logic, decomposed into `concerns/`. |
| Lib | `packages/core/src/lib/` | Domain logic that is neither model nor service (`feed_manager`, `search/`). |
| Client | `apps/web/src/` | React. Brigade's visual design is unchanged by any of this. |

Enforced by `scripts/check-architecture.mjs` — six rules, run in CI and on
pre-push. Pre-existing violations are listed in `.architecture-baseline.json`,
which can only shrink.

### Naming

```
Services     VerbNounService     CreatePostService, VerifyEmploymentService
Workers      NounVerbWorker      ProfileIndexWorker, ConnectionFanOutWorker
Policies     NounPolicy          ProfilePolicy, JobPostingPolicy
Serializers  NounSerializer      ProfileSerializer
Concerns     Namespaced          profile/interactions, profile/counters
```

The value is not aesthetic. It means "where does the logic for X live" has
exactly one answer.

---

## The data model

Migrations: `packages/core/db/migrations/`. They apply to a **`brigade` schema**
that sits alongside the legacy `users`/`posts`/`connections` schemas the live app
still runs on, so the new model can be built and tested against a real database
without touching production data. Porting the live data is a later, explicit
step.

**The load-bearing decision is the User/Profile split.** A `User` is
credentials; a `Profile` is an actor. Only some profiles have a user:

| | User? | Profile? |
|---|---|---|
| A person who signed up | ✅ | ✅ |
| A company page | ❌ | ✅ |
| An unclaimed company | ❌ | ✅ |
| An invited person who hasn't accepted | ❌ | ✅ |

Merge them and you end up with `is_company BOOLEAN`, a nullable password
column, and a users table where half the rows cannot log in — every query then
carries a filter it shouldn't need. Everything else in the schema is recoverable
with a migration; this one is architectural.

Other decisions worth knowing before reading the SQL:

- **Time-sortable IDs.** `brigade.snowflake_id()` puts a millisecond timestamp
  in the high bits, so sorting by id sorts by time (a Redis feed score is just
  the id), cursor pagination needs no timestamp index, and ids are not
  enumerable — a scraping defence for free.
- **Counters live in their own tables** (`profile_stats`, `post_stats`). They are
  written constantly and would otherwise invalidate the profile cache and bloat
  the row with dead tuples on every like.
- **Connections are one canonically-ordered row** (`profile_id <
  target_profile_id`), with the requester in `requested_by`. A connection can
  never be half-present. Lookups must check both columns — hence the two indexes.
- **Follows are separate from connections.** Mutual-with-acceptance and
  asymmetric-subscription are different relations; collapsing them makes "2nd
  degree" unanswerable later.
- **Controlled vocabulary with alias tables** for skills, companies, job titles
  and institutions. Without them "JavaScript"/"JS"/"ECMAScript" are three skills
  and every downstream query degrades permanently.
- **`discoverable` is an explicit opt-in column**, not inferred from privacy
  settings. PIPEDA and GDPR both make "was this person listed with their
  knowledge" a question that needs one clean answer.
- **`profile_views` is partitioned by month and written from a scheduler**, not
  synchronously. Every profile page load is a write; this is the first table
  that falls over if built naively.
- **`moderation_log` is append-only**, enforced by a trigger that refuses
  UPDATE and DELETE.

---

## Deferred, deliberately

Federation (ActivityPub), Elasticsearch, feed ranking, and realtime streaming
are all designed *for* but not built. Each has a seam: search sits behind a
swappable interface, ranking is a re-scoring pass over retrieved IDs rather than
the sorted-set score, and the feed is a cache that is always rebuildable from
Postgres.
