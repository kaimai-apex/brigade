# Brigade

Mentorship for private chefs. Find a mentor, book a paid session, get better at the craft.

## Product

Four places after login:

| Route | What it is |
|---|---|
| `/mentors` | Browse and book mentors |
| `/directory` | Member directory |
| `/sessions` | Your booked sessions |
| `/profile/me` | Your profile |

Also: `/mentorship` + `/mentorship/setup` (become a mentor / payouts), `/onboarding`, `/login` (email code, no password), `/waitlist`.

## Stack

- **`apps/web`** — Next.js 15 app (UI + all API routes)
- **`packages/common`** — Postgres pool, JWT, shared auth helpers
- **Postgres** — local Docker or Supabase. Schema lives in `supabase/migrations/`; the app also applies additive DDL lazily via `ensure-*-schema.ts` so a deploy never 500s on a missing column.

No microservices, Kafka, Redis, or gateway. One process (`Procfile`: `web`).

## Quick start

```bash
pnpm install
cp .env.example .env          # set JWT_SECRET at minimum
pnpm infra:up                 # Postgres on :5432
pnpm db:migrate               # optional; ensure-* also self-heals
pnpm --filter @connectpro/common build
pnpm dev:web                  # http://localhost:3100
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev:web` | Next.js on :3100 |
| `pnpm verify` | Guardrails + architecture + typecheck + lint |
| `pnpm --filter @connectpro/web test` | Mentorship + onboarding specs |
| `pnpm --filter @connectpro/web build` | Production build (what Vercel runs) |
| `pnpm infra:up` / `infra:down` | Local Postgres |
| `pnpm db:migrate` | Apply `supabase/migrations/*.sql` |
| `pnpm db:migrate --status` | Show applied vs pending |

## Env

See `.env.example`. Production needs `DATABASE_URL` (Supabase pooler, port 6543), `JWT_SECRET`, `AUTH_SCHEMA=connectpro_auth`, and for paid sessions the Stripe keys in `docs/STRIPE-SETUP.md`.

## Docs

- [`docs/STRIPE-SETUP.md`](docs/STRIPE-SETUP.md) — Connect + webhooks
- [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) — how schema changes land
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — what to do when something breaks
- [`docs/BACKLOG-mentorship.md`](docs/BACKLOG-mentorship.md) — shipping history + open gaps
