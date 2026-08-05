# Brigade — Architecture

Next.js app + Postgres. Mentorship, directory, sessions, and passwordless auth
all run inside `apps/web` against schemas in Supabase / local Docker.

## Layout

```
apps/web/                 Next.js UI + /api/* route handlers
packages/common/          pg pool, JWT, auth schema name, errors
supabase/migrations/      source of truth for DDL
infra/postgres/init.sql   local Docker extensions only
```

Route handlers stay thin: validate input, call a function in
`apps/web/src/lib/server/*` (or `lib/auth/*`), return JSON. SQL lives in those
lib modules, not in the route file — `pnpm check:architecture` enforces that.

## Provenance

Brigade's early backend design was **inspired by** Mastodon's published
architecture. Mastodon is AGPL-3.0. **No Mastodon code is used here** — not a
file, not a function. The social-network microservices that once lived under
`services/` and `packages/core/` were deleted; this repo is a mentorship
marketplace only.

Hygiene that still applies:

1. Never copy-paste from an AGPL/GPL source.
2. `pnpm check:licenses` fails CI on GPL-family licenses in the dependency tree.

## Checks

| Script | What it guards |
|---|---|
| `check:guardrails` | No fake-data deps, no mock data in source, next.config doesn't silence errors |
| `check:architecture` | API routes don't embed SQL writes or import models |
| `check:licenses` | No GPL-family deps |
