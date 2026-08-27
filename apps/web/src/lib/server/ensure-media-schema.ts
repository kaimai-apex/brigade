import { getPool } from "@connectpro/common";

/**
 * Bring the connected database up to what media uploads need
 * (supabase/migrations/019_media_objects.sql), idempotently, on first use.
 *
 * Same reasoning as ensureDirectorySchema(): the hosted database is migrated by
 * hand, so a deploy can land ahead of its migration. Without this, the first
 * upload after that deploy fails on a missing table. Memoised per process, so
 * it costs one round-trip per cold start.
 */

let ready: Promise<void> | null = null;

function isPrivilegeError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "42501";
}

async function tryDdl(
  pool: ReturnType<typeof getPool>,
  sql: string,
  label: string,
): Promise<void> {
  try {
    await pool.query(sql);
  } catch (error) {
    if (isPrivilegeError(error)) {
      console.warn(
        `[ensure-media-schema] skip ${label}:`,
        error instanceof Error ? error.message : error,
      );
      return;
    }
    throw error;
  }
}

export function ensureMediaSchema() {
  if (ready) return ready;

  ready = (async () => {
    const pool = getPool();

    const existing = await pool.query(
      `SELECT to_regclass('users.media_objects') AS reg`,
    );
    if (existing.rows[0]?.reg) return;

    await tryDdl(
      pool,
      `
      CREATE TABLE IF NOT EXISTS users.media_objects (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_user_id UUID        NOT NULL,
        kind          TEXT        NOT NULL,
        content_type  TEXT        NOT NULL,
        byte_size     INT         NOT NULL,
        bytes         BYTEA       NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT media_objects_kind_check
          CHECK (kind IN ('avatar', 'cover', 'gallery', 'resume')),
        CONSTRAINT media_objects_size_check CHECK (byte_size > 0)
      )
    `,
      "table media_objects",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_media_objects_owner
        ON users.media_objects (owner_user_id, kind, created_at DESC)
    `,
      "idx_media_objects_owner",
    );
  })();

  // A failed attempt shouldn't be cached — the next request should retry.
  ready.catch(() => {
    ready = null;
  });

  return ready;
}
