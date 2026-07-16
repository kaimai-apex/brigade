import { getPool } from "@connectpro/common";

let ready: Promise<void> | null = null;

/** Idempotent waitlist table for pre-launch contact capture. */
export async function ensureWaitlistSchema() {
  if (ready) return ready;

  ready = (async () => {
    const pool = getPool();
    await pool.query("CREATE EXTENSION IF NOT EXISTS citext");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.waitlist_signups (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email          CITEXT UNIQUE NOT NULL,
        name           TEXT NOT NULL,
        phone          TEXT,
        phone_country  TEXT,
        source         TEXT NOT NULL DEFAULT 'landing',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      ALTER TABLE public.waitlist_signups
        ADD COLUMN IF NOT EXISTS phone TEXT
    `);
    await pool.query(`
      ALTER TABLE public.waitlist_signups
        ADD COLUMN IF NOT EXISTS phone_country TEXT
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created
        ON public.waitlist_signups (created_at DESC)
    `);
  })();

  return ready;
}
