import { getPool } from "@connectpro/common";
import { ensureMediaSchema } from "@/lib/server/ensure-media-schema";

/**
 * The only module that knows where uploaded bytes actually live.
 *
 * Today that is Postgres (see supabase/migrations/019_media_objects.sql for why).
 * If the volume ever justifies an object store, this file is the seam: the URL
 * shape `/api/media/<uuid>.<ext>` and everything downstream of it stay the same.
 */

export type MediaKind = "avatar" | "cover" | "gallery" | "resume";

/** Public kinds are readable by anyone — mentor pages are public pages. */
export const PUBLIC_MEDIA_KINDS: ReadonlySet<MediaKind> = new Set<MediaKind>([
  "avatar",
  "cover",
  "gallery",
]);

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function contentTypeForExtension(ext: string): string | null {
  return EXTENSION_CONTENT_TYPES[ext] ?? null;
}

export type StoredMedia = {
  id: string;
  ownerUserId: string;
  kind: MediaKind;
  contentType: string;
  bytes: Buffer;
};

/**
 * Persist an upload and return the URL it is served from.
 *
 * The extension is carried in the URL rather than looked up on read so that the
 * existing same-origin URL validators (lib/avatars.ts, lib/banners.ts) can keep
 * deciding "is this an image?" from the string alone, without a database round
 * trip on every render.
 */
export async function dbPutMedia(params: {
  ownerUserId: string;
  kind: MediaKind;
  extension: string;
  bytes: Buffer;
}): Promise<{ id: string; url: string }> {
  await ensureMediaSchema();

  const contentType = contentTypeForExtension(params.extension);
  if (!contentType) {
    throw new Error(`Unsupported media extension: ${params.extension}`);
  }

  const result = await getPool().query(
    `INSERT INTO users.media_objects (owner_user_id, kind, content_type, byte_size, bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      params.ownerUserId,
      params.kind,
      contentType,
      params.bytes.byteLength,
      params.bytes,
    ],
  );

  const id = result.rows[0].id as string;
  return { id, url: `/api/media/${id}.${params.extension}` };
}

export async function dbGetMedia(id: string): Promise<StoredMedia | null> {
  await ensureMediaSchema();

  const result = await getPool().query(
    `SELECT id, owner_user_id, kind, content_type, bytes
       FROM users.media_objects
      WHERE id = $1`,
    [id],
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id as string,
    ownerUserId: row.owner_user_id as string,
    kind: row.kind as MediaKind,
    contentType: row.content_type as string,
    bytes: row.bytes as Buffer,
  };
}

/** Every gallery-eligible image this member has uploaded, newest first. */
export async function dbListOwnedMedia(
  ownerUserId: string,
  kind: MediaKind,
): Promise<{ id: string; url: string; createdAt: string }[]> {
  await ensureMediaSchema();

  const result = await getPool().query(
    `SELECT id, created_at
       FROM users.media_objects
      WHERE owner_user_id = $1 AND kind = $2
      ORDER BY created_at DESC`,
    [ownerUserId, kind],
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    url: `/api/media/${row.id}.jpg`,
    createdAt: (row.created_at as Date).toISOString(),
  }));
}

/** Owner-scoped delete. Returns false when the id is absent or someone else's. */
export async function dbDeleteOwnedMedia(
  ownerUserId: string,
  id: string,
): Promise<boolean> {
  await ensureMediaSchema();

  const result = await getPool().query(
    `DELETE FROM users.media_objects WHERE id = $1 AND owner_user_id = $2`,
    [id, ownerUserId],
  );
  return (result.rowCount ?? 0) > 0;
}
