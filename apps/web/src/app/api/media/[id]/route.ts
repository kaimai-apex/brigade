import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  contentTypeForExtension,
  dbGetMedia,
  PUBLIC_MEDIA_KINDS,
} from "@/lib/server/media-db";

/**
 * Serve an uploaded file.
 *
 * The path carries the extension (`/api/media/<uuid>.jpg`) so that the
 * same-origin URL validators can classify a stored URL without a database read.
 * The extension in the URL is never trusted for the response Content-Type —
 * that comes from the row, which was set from sniffed bytes at upload time.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: segment } = await params;

  const match = /^([0-9a-f-]{36})\.([a-z0-9]{1,5})$/i.exec(segment);
  if (!match) {
    return new NextResponse("Not found", { status: 404 });
  }
  const [, id, extension] = match;
  if (!contentTypeForExtension(extension.toLowerCase())) {
    return new NextResponse("Not found", { status: 404 });
  }

  const media = await dbGetMedia(id).catch(() => null);
  if (!media) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Resumes are documents, not decoration: only the owner may read one. Images
  // are public because mentor and journal pages are public pages.
  if (!PUBLIC_MEDIA_KINDS.has(media.kind)) {
    const session = await getConnectProSession();
    if (!session || session.userId !== media.ownerUserId) {
      // 404 rather than 403 — whether a given id exists is itself private.
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const isPublic = PUBLIC_MEDIA_KINDS.has(media.kind);

  return new NextResponse(new Uint8Array(media.bytes), {
    status: 200,
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.bytes.byteLength),
      // Rows are never rewritten in place — a new upload is a new id — so the
      // bytes behind a given URL are immutable and can be cached hard. Private
      // media must not be cached by shared caches at all.
      "Cache-Control": isPublic
        ? "public, max-age=31536000, immutable"
        : "private, no-store",
      "Content-Disposition": isPublic ? "inline" : "attachment",
      // Never let a stored file be interpreted as something else.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
