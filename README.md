# Brigade (ConnectPro)

Hospitality talent network — LinkedIn-style profiles, feed, connections, jobs, and messaging.

## Quick start (local)

### Prerequisites

- Node 20+, pnpm 9+
- Docker (Postgres, Redis, Kafka)

### 1. Environment

Copy `.env.example` to `.env` and adjust if needed. Defaults target local Docker infra.

### 2. Start infrastructure

```bash
pnpm infra:up
```

### 3. Run migrations

Apply SQL in order (Postgres init runs on first Docker start; for Supabase or existing DB):

**Supabase:** use `003_connectpro_schemas_supabase.sql` (not `003_connectpro_schemas.sql` — Supabase owns the `auth` schema). Set `AUTH_SCHEMA=connectpro_auth` in `.env`.

**Local Docker Postgres:** use `infra/postgres/init.sql` or `003_connectpro_schemas.sql`. Leave `AUTH_SCHEMA` unset (defaults to `auth`).

- `supabase/migrations/003_connectpro_schemas_supabase.sql` (Supabase) **or** `003_connectpro_schemas.sql` (local)
- `supabase/migrations/004_onboarding_updates.sql` (optional — legacy Supabase public schema only)
- `supabase/migrations/005_brigade_user_fields.sql`
- `supabase/migrations/006_saved_jobs.sql`

Optional seed:

```bash
psql "$DATABASE_URL" -f scripts/seed-local.sql
```

### 4. Start the stack

```bash
pnpm dev:stack
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3100 |
| API gateway | http://localhost:3000 |

### 5. Sign up

1. Go to http://localhost:3100/signup
2. Complete onboarding (basic info → experience → education → portfolio → availability → review)
3. Use feed, connections, jobs, messages from the nav

## Architecture

- **Web:** Next.js 15 (`apps/web`) — BFF routes proxy to ConnectPro via `/api/connectpro/*`
- **Auth:** ConnectPro JWT in httpOnly cookies + localStorage for client API
- **Uploads:** Local files in `public/uploads/` via `/api/media/upload` (no S3 required for dev)
- **Backend:** 14 NestJS microservices behind API gateway on port 3000

## What you still wire up

These are stubbed or need your credentials:

- Supabase (optional — web uses ConnectPro auth by default)
- Supabase + Google OAuth (Supabase provider → ConnectPro session bridge)
- SendGrid / Twilio / Firebase push
- S3 media (media-service returns presigned URLs; dev uses local upload BFF)
- Real MFA email/SMS (dev accepts `000000`)
- Password reset email flow
- OpenSearch (search-service uses in-memory index)
- WebSocket messaging (REST polling only in UI)
- Production deploy (Vercel + managed Postgres/Kafka)

## Useful commands

```bash
pnpm dev:stop          # kill local processes
pnpm dev:web           # web only
pnpm build             # production build all packages
pnpm --filter @connectpro/web build
```

## Project docs

See `brigade-build-files/` for full specs: `BUILD_PHASES.md`, `API_SPEC.md`, `MICROSERVICES_SPEC.md`.
