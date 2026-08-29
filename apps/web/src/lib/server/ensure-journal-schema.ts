import { getPool } from "@connectpro/common";

let ready: Promise<void> | null = null;

function isPrivilegeError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "42501";
}

/**
 * Idempotent journal-gate table. Same safety net as the waitlist: production
 * may lag a deploy, so the first unlock creates the table if the role can.
 */
export function ensureJournalSchema() {
  if (ready) return ready;

  ready = (async () => {
    const pool = getPool();
    const present = await pool.query(
      `SELECT 1
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'journal_subscribers'
        LIMIT 1`,
    );
    if (present.rows.length > 0) {
      try {
        await pool.query(
          "ALTER TABLE public.journal_subscribers ADD COLUMN IF NOT EXISTS phone TEXT",
        );
      } catch (error) {
        if (!isPrivilegeError(error)) throw error;
        console.warn(
          "[ensure-journal-schema] skip phone column:",
          error instanceof Error ? error.message : error,
        );
      }
      return;
    }

    try {
      await pool.query("CREATE EXTENSION IF NOT EXISTS citext");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.journal_subscribers (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email        CITEXT UNIQUE NOT NULL,
          article_slug TEXT,
          phone        TEXT,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_journal_subscribers_created
          ON public.journal_subscribers (created_at DESC)
      `);
      await pool.query(
        "REVOKE ALL ON TABLE public.journal_subscribers FROM PUBLIC",
      );
    } catch (error) {
      if (isPrivilegeError(error)) {
        console.warn(
          "[ensure-journal-schema] skip:",
          error instanceof Error ? error.message : error,
        );
        return;
      }
      throw error;
    }
  })();

  return ready;
}
