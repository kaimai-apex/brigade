# 04 — Phase 0: Foundations

**Goal:** Brigade's repo has Mastodon's shape, runs identically on any machine, and CI
enforces the boundaries before there's any code to violate them.

**Effort:** 1–2 weeks solo
**Blocks:** everything
**Depends on:** `01-decision-gate.md` being answered

---

## Why this phase exists

The layer boundaries in Mastodon work because they were established before the code that
lives in them. Retrofitting a service layer onto 40,000 lines of controller logic is a
rewrite. Establishing it on an unfinished product is an afternoon.

You have landing, directory, and partial onboarding. That is the correct amount of code to
have when doing this.

---

## Deliverable 1: Directory structure

Mirror the reference layout. Adapted for a TypeScript stack (Option B); if you chose
Rails, use Mastodon's paths verbatim.

```
brigade/
├── src/
│   ├── models/           ORM models + domain logic
│   │   └── concerns/     mixins — profile/, post/
│   ├── services/         ← ALL WRITES. VerbNounService
│   ├── workers/          background jobs, mirrors services/
│   ├── lib/              domain logic that isn't model or service
│   │   ├── feed_manager.ts
│   │   └── search/
│   ├── controllers/      thin HTTP. auth → policy → service → serializer
│   │   ├── api/v1/
│   │   └── web/          server-rendered pages
│   ├── policies/         authorization, one per resource
│   ├── serializers/      JSON shaping — the ONLY place API shape is decided
│   ├── validators/
│   └── presenters/
├── client/               React app (your existing frontend moves here)
│   ├── features/         one directory per screen
│   ├── components/       shared presentational
│   ├── actions/ reducers/ selectors/ store/
│   ├── api/              API client modules
│   ├── api_types/        TS types matching wire format
│   ├── models/           normalized client-side shapes
│   ├── hooks/ utils/
│   └── styles/           ← Brigade's existing design system lands here intact
├── db/
│   ├── migrations/
│   └── seeds/
├── spec/                 mirrors src/ exactly
├── streaming/            separate Node process (Phase 7)
├── config/
│   └── queues.yml        Sidekiq-equivalent queue weights
├── docs/
│   ├── ARCHITECTURE.md   ← required, see 01-decision-gate.md
│   └── DEVELOPMENT.md
├── docker-compose.yml
├── Dockerfile
└── Procfile              web / worker / streaming
```

**`serializers/` is the one people skip.** Without it, API response shape gets decided
inline in controllers, four endpoints return the same object four different ways, and the
frontend accumulates defensive normalization. One serializer per resource, always.

---

## Deliverable 2: Local environment

Mastodon ships `docker-compose.yml`, `.devcontainer/`, `Vagrantfile`, and three `.env`
templates. The point is that setup is never a question.

Minimum for Brigade:

```yaml
# docker-compose.yml
services:
  db:        postgres:16          # match production major version exactly
  redis:     redis:7
  search:    elasticsearch:8      # optional, Phase 5
  web:       build: .             # depends_on: db, redis
  worker:    build: .             # same image, different command
```

Plus:
- `.env.example` — every variable, documented, with safe defaults
- `Procfile` / `Procfile.dev` — process types, so dev and prod topology match
- `bin/setup` — one command from clone to running. Test it on a clean machine.

> Match your local Postgres major version to production. Not "roughly." Query planner
> behavior and index types differ between majors, and you will lose a day to it.

---

## Deliverable 3: CI that enforces architecture

This is the part that makes the whole plan stick. Everything else is a suggestion until CI
rejects violations.

```yaml
# .github/workflows/ci.yml
jobs:
  lint:              eslint + prettier (or rubocop)
  typecheck:         tsc --noEmit
  test:              unit + integration, against real Postgres + Redis
  migration-safety:  reject locking migrations on large tables
  license-scan:      ← REQUIRED. Fails on any AGPL/GPL dependency
  architecture:      ← custom, see below
```

### The architecture check

A custom lint rule, ~50 lines, that enforces:

| Rule | Rationale |
|---|---|
| Controllers may not import models directly | Forces service layer |
| Controllers may not contain DB writes | Same |
| Workers may not contain business logic — they call a service | Retries must be idempotent |
| Services may not import controllers | No circular deps |
| Serializers may not perform queries | N+1 prevention |
| Nothing in `src/` imports from `client/` | Keeps the boundary real |

Write it in week one. It costs an afternoon and it is the difference between having this
architecture in a year and having a document describing an architecture you don't have.

### License scanning

Non-negotiable given Phase 0's context. Fail the build on any GPL-family license in the
dependency tree. Tools: `license-checker` (npm), `licensee` (Ruby), `scancode-toolkit`
(both). Allowlist: MIT, Apache-2.0, BSD-2/3, ISC.

---

## Deliverable 4: Migration safety from day one

Mastodon uses `strong_migrations`, which refuses to generate a migration that would take a
long lock. Adopt the equivalent, or at minimum a documented rule set:

- Never add a `NOT NULL` column with a default to a large table in one step
- Always create indexes `CONCURRENTLY`
- Never rename a column in a single deploy — add, backfill, dual-write, cut over, drop
- Every migration must have a tested down-path
- Backfills run as background jobs, never inline in a migration

Right now Brigade's tables are empty and none of this matters. That is exactly why the
rules are free to adopt today and expensive to adopt later.

---

## Deliverable 5: `docs/ARCHITECTURE.md`

Required output of `01-decision-gate.md`. Contents:

1. The stack and why
2. The layer boundaries and what each is for
3. The naming conventions from `03-concept-mapping.md`
4. **The Mastodon provenance statement** — design inspired by Mastodon's published
   architecture, no code reuse, per the licensing decision
5. The decision record

Point 4 is the one that matters if anyone ever asks. Write it now, while it's true and you
can say so honestly.

---

## Exit criteria

- [ ] `git clone && bin/setup && bin/dev` works on a clean machine in under 10 minutes
- [ ] Directory structure exists, with a `.keep` in every empty directory
- [ ] CI runs on every PR: lint, typecheck, test, license-scan, architecture-check
- [ ] The architecture check demonstrably fails on a deliberate violation — write the
      violating commit, watch it fail, revert it
- [ ] `docs/ARCHITECTURE.md` committed with the decision record filled in
- [ ] Existing Brigade landing/directory/onboarding code relocated into the new layout,
      still functional
- [ ] Migration safety tooling installed and verified

---

## Notes

**Do not port existing Brigade logic into services yet.** Move files into the new
directory structure and get CI green. Rewriting logic and moving it simultaneously means
you can't tell which change broke things. Phase 1 and 2 do the rewriting.

**Resist adding features during this phase.** It produces no user-visible progress and
will feel unproductive — that feeling is the reason most teams skip it and end up with a
2,000-line controller. It's two weeks. Take them.
