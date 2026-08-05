# Migration safety

Brigade's tables are still small. Adopt these rules now; they get expensive later.

## The rules

1. **Never add a `NOT NULL` column with a default to a large table in one step.**
   Add nullable → backfill in batches → add the constraint `NOT VALID` →
   `VALIDATE CONSTRAINT`.

2. **Always create indexes `CONCURRENTLY` against a populated table.**
   Plain `CREATE INDEX` is fine on empty tables (current state). Re-issue
   `CONCURRENTLY` once production has real volume — and not inside a transaction.

3. **Never rename a column in a single deploy.** Expand → dual-write → backfill →
   switch reads → drop the old one.

4. **Migrations are additive within a release.** A deploy must work against both
   the old and new schema for a few minutes.

5. **Backfills run as background jobs, never inline in a migration.**

## Where the files live

```
supabase/migrations/
  001_auth.sql … 018_passwordless_login.sql
```

Apply with:

```bash
DATABASE_URL=... pnpm db:migrate
DATABASE_URL=... pnpm db:migrate --status
```

Or paste a file into the Supabase SQL editor (production today).

## The hosted-database safety net

Production can lag a deploy. Additive schema needed by a live read path is also
applied lazily and idempotently on first use:

- `apps/web/src/lib/auth/ensure-auth-schema.ts`
- `apps/web/src/lib/server/ensure-directory-schema.ts`
- `apps/web/src/lib/server/ensure-mentorship-schema.ts`
- `apps/web/src/lib/waitlist/ensure-waitlist-schema.ts`

That is a safety net, not a substitute for running migrations.
