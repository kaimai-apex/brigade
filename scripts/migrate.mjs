#!/usr/bin/env node
/**
 * Apply supabase/migrations/*.sql in lexical order against DATABASE_URL.
 *
 * Hosted Supabase is usually migrated by hand in the SQL editor; this runner
 * is for local Docker Postgres and for operators who want a repeatable apply.
 * Each file is recorded in public.schema_migrations so re-runs are no-ops.
 *
 * Usage:
 *   DATABASE_URL=... pnpm db:migrate
 *   DATABASE_URL=... pnpm db:migrate --status
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "supabase", "migrations");
const statusOnly = process.argv.includes("--status");

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is required");
  process.exitCode = 1;
  process.exit();
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id         TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 000_wipe_*.sql is a deliberate full reset for the SQL editor — never apply
  // it from this runner or a deploy would erase production.
  const files = (await readdir(DIR))
    .filter((f) => f.endsWith(".sql") && !/^000_wipe/i.test(f))
    .sort();

  const applied = new Set(
    (await client.query("SELECT id FROM public.schema_migrations")).rows.map(
      (r) => r.id,
    ),
  );

  let pending = 0;
  for (const file of files) {
    const done = applied.has(file);
    if (statusOnly) {
      console.log(`${done ? "✓" : "·"} ${file}`);
      if (!done) pending++;
      continue;
    }
    if (done) continue;
    const sql = await readFile(path.join(DIR, file), "utf8");
    console.log(`→ ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO public.schema_migrations (id) VALUES ($1)",
        [file],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  if (statusOnly) {
    console.log(
      pending === 0
        ? `status: all ${files.length} applied`
        : `status: ${pending} pending / ${files.length} total`,
    );
  } else {
    console.log("migrate: done");
  }
} finally {
  await client.end();
}
