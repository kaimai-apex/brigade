# Brigade Supabase migrations

App auth uses Postgres schema `connectpro_auth` (Supabase’s `auth` schema is
reserved for GoTrue).

## Apply pending migrations

Preferred (local Docker or any `DATABASE_URL`):

```bash
DATABASE_URL=... pnpm db:migrate --status
DATABASE_URL=... pnpm db:migrate
```

`000_wipe_brigade.sql` is **never** applied by the runner — it is a manual
full reset for the SQL editor only.

## Fresh rebuild (SQL Editor)

1. `migrations/000_wipe_brigade.sql` — drop Brigade schemas (destructive)
2. `001` → `018` in order (or `pnpm db:migrate` against an empty database)

The web app also applies additive DDL lazily via `ensure-*-schema.ts`, so a
deploy that lands ahead of a hand-applied migration does not 500.

## Env

```
AUTH_SCHEMA=connectpro_auth
DATABASE_URL=<transaction pooler URI, port 6543>
JWT_SECRET=<long random string>
```

## Local Docker

`infra/postgres/init.sql` only installs extensions. Tables are created on first
use by the ensure-schema modules, or by `pnpm db:migrate`. Use
`AUTH_SCHEMA=connectpro_auth` to match production.
