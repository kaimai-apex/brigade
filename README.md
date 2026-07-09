# Brigade

**The professional network for hospitality.** Profiles, a directory, a feed, connections, jobs, companies, and messaging for chefs, bar, FOH, sommeliers, GMs, pastry, servers, and owners — *every seat at the table*.

- **Live:** https://www.joinbrigade.co
- **Stack:** Next.js 15 web app + 14 NestJS microservices behind an API gateway, in a pnpm + Turbo monorepo.

---

## What's inside

```
Brigade/
├─ apps/
│  └─ web/                 # Next.js 15 app (React 19, Tailwind v4, shadcn/ui, Redux Toolkit)
├─ services/               # 14 NestJS microservices + gateway (SWC dev runner)
│  ├─ api-gateway/         # :3000  — proxies /api/v1/* to the services below
│  ├─ auth-service/        # :3002
│  ├─ user-service/        # :3003
│  ├─ connection-service/  # :3004
│  ├─ post-service/        # :3005
│  ├─ feed-service/        # :3006
│  ├─ messaging-service/   # :3007
│  ├─ notification-service/# :3008
│  ├─ search-service/      # :3009
│  ├─ job-service/         # :3010
│  ├─ company-service/     # :3011
│  ├─ media-service/       # :3012
│  ├─ analytics-service/   # :3013
│  ├─ recommendation-service/ # :3014
│  └─ hello-service/       # sample
├─ packages/
│  └─ common/              # @connectpro/common — shared config, db pool, logger, errors, Kafka/Redis
├─ infra/                  # docker-compose infra + postgres/init.sql (all schemas)
└─ supabase/migrations/    # SQL migrations (000 wipe → 001–006)
```

## Tech stack

| Layer | Tech |
|---|---|
| Web | Next.js 15, React 19, TypeScript, Tailwind v4, **shadcn/ui**, Redux Toolkit, email/password auth (ConnectPro JWT) |
| Backend | NestJS microservices, Express 5 gateway, `pg`, Kafka (KafkaJS), Redis, OpenSearch |
| Infra | Docker Compose: Postgres 16, Redis, Kafka + Zookeeper, MongoDB, Cassandra, OpenSearch, Jaeger |
| Tooling | pnpm workspaces, Turbo, SWC (`@swc-node/register`) for dev, `tsc` for build |
| Deploy | Vercel (web app), auto-deploys on push to `main` |

## Design system

The web app uses **shadcn/ui** (new-york, Tailwind v4) bridged to the Brigade brand:

- A **token bridge** in `apps/web/src/app/globals.css` maps shadcn's semantic variables (`--background`, `--card`, `--primary`, `--muted`, `--border`, `--ring`, `--radius`, …) to the Brigade palette — warm **cream / paper / ink / forest / rust**, **gold** focus ring, Fraunces display + Archivo body. Light theme only.
- Components live in `apps/web/src/components/ui/` (avatar, badge, dropdown-menu, tabs, tooltip, sonner, skeleton, dialog, sheet, table, command, …). Add more with the shadcn CLI (`components.json` is configured).
- A global **⌘K command palette** (`components/command-menu.tsx`) for search + navigation.

---

## Local development

### Prerequisites

- Node 20+
- pnpm 9+  (`npm i -g pnpm`)
- Docker Desktop (Postgres / Redis / Kafka / Mongo / OpenSearch)

### 1. Install

```bash
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
cp .env.local.example .env.local   # NEXT_PUBLIC_SUPABASE_* for the web app
```

For a **fully local stack**, `.env` already points `DATABASE_URL` at the Docker Postgres
(`postgresql://connectpro:connectpro@localhost:5432/connectpro`). The remote Supabase URL is
commented above it — swap them to target Supabase instead.

### 3. Start infrastructure

```bash
pnpm infra:up          # docker compose up -d
```

Postgres is auto-seeded on first start by `infra/postgres/init.sql` (schemas: `auth`, `users`,
`connections`, `jobs`, `posts`, `notifications`, …). Optional demo data:

```bash
psql "$DATABASE_URL" -f scripts/seed-local.sql
```

> **OpenSearch note:** the compose file disables the security plugin so it serves plain HTTP on `:9200`
> (matches `OPENSEARCH_URL`) — no admin password needed.

### 4. Run the whole stack

```bash
pnpm dev:stack         # builds @connectpro/common, then runs all 14 services + web
```

| Surface | URL |
|---|---|
| Web app | http://localhost:3100 |
| API gateway | http://localhost:3000 |
| Jaeger (tracing) | http://localhost:16686 |

Other runners:

```bash
pnpm dev:web           # web only (:3100)
pnpm dev:services      # all backend services (Turbo)
pnpm dev:gateway       # gateway only
pnpm dev:stop          # kill dev processes + free ports 3000/3100/3002-3014
pnpm infra:down        # stop docker infra
```

> **Dev runner:** services run through SWC (`node --watch -r @swc-node/register`), **not** tsx —
> tsx/esbuild doesn't emit `emitDecoratorMetadata`, which silently breaks NestJS dependency injection.

### 5. Sign up

1. Go to http://localhost:3100/signup (email/password or Google).
2. Complete onboarding (basic info → experience → education → portfolio → availability → review).
3. Use the feed, network, jobs, companies, messages, and ⌘K search from the nav.

---

## Architecture

- **Web (`apps/web`)** — Next.js App Router. BFF routes under `/api/*` proxy to the gateway
  (`/api/connectpro/[...path]` → `NEXT_PUBLIC_API_URL`). Auth is a ConnectPro JWT in an httpOnly
  cookie plus localStorage for the client API layer; signup/login also supports Supabase Google OAuth.
- **Gateway (`services/api-gateway`, :3000)** — Express 5; `expressApp.all('/api/v1/*splat')` routes each
  first path segment to the owning service via `SERVICE_ROUTES`.
- **Services** — NestJS, each with its own controllers/service and a `pg` pool to Postgres; events over Kafka,
  caching in Redis, search in OpenSearch.
- **Shared (`packages/common`)** — `loadConfig`, `getPool`, logger, `GlobalExceptionFilter` (logs unhandled
  errors with a traceId), Kafka/Redis clients.

---

## Deployment (Vercel)

The **web app** deploys to Vercel and auto-builds on push to `main`.

### Project settings (one-time, in the Vercel dashboard)

| Setting | Value |
|---|---|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js |
| Install / Build command | provided by `apps/web/vercel.json` (installs + builds the whole workspace) |

`apps/web/vercel.json`:

```json
{
  "framework": "nextjs",
  "installCommand": "cd ../.. && pnpm install",
  "buildCommand": "cd ../.. && pnpm --filter @connectpro/common build && pnpm --filter @connectpro/web build"
}
```

> **Gotcha we hit:** a Vercel deploy can be `READY` yet 404 on every route if the **Framework Preset isn't
> set to Next.js** — it then serves the build output as a static site with no routing. Pinning
> `framework: nextjs` (here **and** in project settings) fixes it.

### Environment variables (Vercel → Settings → Environment Variables)

| Var | Purpose |
|---|---|
| `DATABASE_URL` or `SUPABASE_DB_*` | Supabase Transaction pooler (port 6543) for email/password auth |
| `AUTH_SCHEMA` | Must be `connectpro_auth` on Supabase |
| `JWT_SECRET` | Signing key for ConnectPro access tokens |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL — e.g. `https://www.joinbrigade.co` |
| `NEXT_PUBLIC_API_URL` | Gateway base URL — only meaningful once the backend is deployed |

Schema rebuild: see `supabase/README.md` (`000` wipe → `001`–`006`).

### What deploys vs. what's local-only

Vercel serves the **web frontend + ConnectPro email/password auth** (Postgres via pooler). The **14 microservices + infra are not deployed** — so
data-backed pages (feed, jobs, directory via the gateway) only fully work against a running backend. Point
`NEXT_PUBLIC_API_URL` at a deployed gateway to light those up in production (see Next steps).

---

## Scripts

```bash
pnpm dev:stack                        # full local stack (services + web)
pnpm dev:web                          # web only
pnpm build                            # turbo build (all packages)
pnpm --filter @connectpro/web build   # exactly what Vercel runs
pnpm lint                             # turbo lint
pnpm infra:up | infra:down | infra:logs
```

## Still to wire up

- Deploy the backend (gateway + services) — e.g. containers on Fly/Render/Railway + managed Postgres/Kafka/Redis — and set `NEXT_PUBLIC_API_URL`.
- SendGrid / Twilio / Firebase push (notification-service is stubbed).
- S3 media (media-service returns presigned URLs; dev uses a local upload BFF in `public/uploads/`).
- Real MFA email/SMS (dev accepts `000000`) and password-reset email.
- WebSocket messaging (UI currently REST-polls every 5s).
- OpenSearch indexing pipeline (search-service falls back to simple queries).

## Next steps

1. **Ship the backend** so production isn't frontend-only (the biggest gap) and set `NEXT_PUBLIC_API_URL`.
2. **Seed real data** and resolve the id-placeholder avatars/names in feed & messages to real profiles.
3. **Realtime** messaging + notifications over WebSockets.
4. **Harden auth** (MFA, password reset, refresh-token rotation) end to end.
5. **CI** — run `pnpm build` + `pnpm lint` on PRs; add Playwright smoke tests for signup → onboarding → feed.

## Docs

Full specs live in `brigade-build-files/`: `BUILD_PHASES.md`, `API_SPEC.md`, `MICROSERVICES_SPEC.md`.
