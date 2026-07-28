#!/usr/bin/env node
/**
 * Apply core migrations in order, once each.
 *
 * Tracks what has run in brigade.schema_migrations, so this is safe to run on
 * every deploy — the alternative, a human remembering which files are
 * outstanding, is what left production 500ing on a missing column earlier.
 *
 * Usage:
 *   node scripts/migrate.mjs            apply pending migrations
 *   node scripts/migrate.mjs --status   list applied and pending
 */
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "packages/core/db/migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("migrate: DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();

  await pool.query(`CREATE SCHEMA IF NOT EXISTS brigade`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brigade.schema_migrations (
      version     TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const applied = new Set(
    (await pool.query("SELECT version FROM brigade.schema_migrations")).rows.map((r) => r.version),
  );

  if (process.argv.includes("--status")) {
    for (const file of files) {
      console.log(`${applied.has(file) ? "applied" : "PENDING"}  ${file}`);
    }
    await pool.end();
    return;
  }

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log("migrate: nothing to do");
    await pool.end();
    return;
  }

  for (const file of pending) {
    const sql = readFileSync(path.join(DIR, file), "utf8");
    const client = await pool.connect();
    try {
      // Each migration is one transaction: it applies completely or not at all,
      // and a failure leaves the version unrecorded so the next run retries it.
      //
      // CREATE INDEX CONCURRENTLY cannot run inside a transaction. Those live
      // in their own file and are marked with the comment below, which switches
      // this to running them unwrapped.
      const concurrent = /CREATE\s+INDEX\s+CONCURRENTLY/i.test(sql);
      if (!concurrent) await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO brigade.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
        [file],
      );
      if (!concurrent) await client.query("COMMIT");
      console.log(`migrate: applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error(`migrate: FAILED on ${file}`);
      console.error(error instanceof Error ? error.message : error);
      client.release();
      await pool.end();
      process.exit(1);
    } finally {
      client.release();
    }
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
