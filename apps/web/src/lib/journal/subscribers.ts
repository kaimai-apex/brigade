import { getPool } from "@connectpro/common";
import { ensureJournalSchema } from "@/lib/server/ensure-journal-schema";
import { sanitizeResourceSlug } from "@/lib/journal/resource-slug";

export async function countRecentJournalSubscribers(
  windowMinutes: number,
): Promise<number> {
  await ensureJournalSchema();
  const pool = getPool();
  const result = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM public.journal_subscribers
      WHERE created_at > NOW() - ($1::int * INTERVAL '1 minute')`,
    [windowMinutes],
  );
  return result.rows[0]?.n ?? 0;
}

export async function journalSubscriberExists(email: string): Promise<boolean> {
  await ensureJournalSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT 1 FROM public.journal_subscribers WHERE email = $1 LIMIT 1`,
    [email],
  );
  return result.rows.length > 0;
}

export async function saveJournalSubscriber(input: {
  email: string;
  articleSlug?: string;
}): Promise<{ inserted: boolean }> {
  await ensureJournalSchema();
  const pool = getPool();
  const slug = sanitizeResourceSlug(input.articleSlug);
  const result = await pool.query(
    `INSERT INTO public.journal_subscribers (email, article_slug)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [input.email, slug],
  );
  return { inserted: result.rowCount === 1 };
}
