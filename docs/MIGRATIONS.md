# Migration safety

Brigade's tables are effectively empty today, which is exactly why these rules
are free to adopt now and expensive to adopt later. Every one of them exists
because the naive version takes a lock that stops the site.

## The rules

1. **Never add a `NOT NULL` column with a default to a large table in one step.**
   Add nullable → backfill in batches → add the constraint `NOT VALID` →
   `VALIDATE CONSTRAINT`. (Postgres 11+ makes the simple case cheap, but the
   batched path is still correct for anything with a computed default.)

2. **Always create indexes `CONCURRENTLY` against a populated table.**
   `CREATE INDEX` takes an `ACCESS EXCLUSIVE` lock and blocks writes for the
   duration. `CONCURRENTLY` cannot run inside a transaction block, so those
   statements go in their own migration with no `BEGIN`.

   The indexes in `010_directory_indexes.sql` are plain `CREATE INDEX` because
   they were applied to empty tables. Re-issue them `CONCURRENTLY` against
   production.

3. **Never rename a column in a single deploy.** Expand, migrate, contract:
   add the new column → dual-write → backfill → switch reads → drop the old one.
   Four deploys, no downtime.

4. **Every migration has a tested rollback.** Each file in
   `packages/core/db/migrations/` states its rollback in the header comment.
   Test it by applying and reverting against a scratch database before merging.

5. **Backfills run as background jobs, never inline in a migration.** A
   migration that rewrites ten million rows holds a transaction open for the
   duration and blocks the deploy behind it.

6. **Migrations are additive within a release.** A deploy must work against both
   the old and new schema, because for a few minutes both versions of the code
   are running.

## Running them

Locally, against the docker Postgres:

```bash
for f in packages/core/db/migrations/*.sql; do
  docker exec -i brigade-postgres-1 psql -U connectpro -d connectpro -v ON_ERROR_STOP=1 -q < "$f"
done
```

CI applies all of them from scratch against `postgres:16` on every PR (the
`schema` job), which is what keeps "it worked on my machine" from being a
category of failure.

**Match the local Postgres major version to production.** Not "roughly" — query
planner behaviour and index types differ between majors.

## The hosted database

Production is migrated by hand, so a deploy can land ahead of its migration.
When that happens the app must not fall over: additive schema needed by a live
read path is applied lazily and idempotently on first use — see
`apps/web/src/lib/server/ensure-directory-schema.ts`, which exists because the
directory 500'd in production for exactly this reason.

That is a safety net, not a substitute for running migrations.
