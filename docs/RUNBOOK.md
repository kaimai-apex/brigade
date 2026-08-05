# Runbook

One process: Next.js (`web`) talking to Postgres. That is the whole topology.

## Migrations

```bash
DATABASE_URL=... pnpm db:migrate --status
DATABASE_URL=... pnpm db:migrate
```

Applied versions land in `public.schema_migrations`. Hosted Supabase can also
be migrated by pasting files from `supabase/migrations/` into the SQL editor —
do that **before** deploying code that needs the new columns.

The `ensure-*-schema.ts` modules in the web app re-apply additive DDL on first
use as a safety net. They are not a substitute for running migrations.

## Failure modes

### 1. Directory or mentors 500ing

Almost always a missing column (migration not applied).

```bash
DATABASE_URL=... pnpm db:migrate --status
```

Then apply the pending file(s), or paste them in the Supabase SQL editor.

### 2. Login codes not arriving

Passwordless login needs Resend:

- `RESEND_API_KEY` and `RESEND_FROM` set in the environment
- In development without Resend, the code is returned in the API response /
  logged — check the server log, not your inbox

Rate limits live in `connectpro_auth.login_codes`. A flood of rows for one
address or IP means someone is probing; the request-code route already rejects
over the limit.

### 3. Bookings stuck in `pending_payment`

1. Confirm Stripe webhook secret matches the endpoint (`STRIPE_WEBHOOK_SECRET`).
2. Check `mentorship.webhook_events` for the Checkout session id — missing row
   means Stripe never reached you; duplicate with `error` means the handler
   failed and Stripe will retry.
3. The unpaid-hold reaper releases holds after 45 minutes. A charge that lands
   after that is refunded by the webhook rather than confirming a ghost booking.

### 4. Mentor cannot publish

`evaluateReadiness()` in `lib/mentorship/readiness.ts` is the checklist. Paid
sessions require Stripe `payouts_enabled` (read back from Stripe, never inferred
from the return URL). Free-only mentors and Stripe-less deploys are not blocked.

### 5. Database connection errors on Vercel

Use the **transaction pooler** URI (port 6543), not `db.[project].supabase.co`.
The direct host is IPv6-only on many networks and fails from Vercel.
