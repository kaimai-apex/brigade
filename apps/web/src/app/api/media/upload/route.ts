import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';
import {
  AvatarImageError,
  processAvatarImage,
  processCoverImage,
  processGalleryImage,
} from '@/lib/server/avatar-image';
import { dbPutMedia, type MediaKind } from '@/lib/server/media-db';

/**
 * Accept one upload and hand back the URL it will be served from.
 *
 * Bytes go to the database (see lib/server/media-db.ts). They used to go to
 * `public/uploads/` via fs.writeFile, which silently could not work on the
 * deployed site — that is why profile photos never stuck.
 */

const DOC_EXT = new Set(['pdf', 'doc', 'docx']);
const IMAGE_KINDS = new Set<MediaKind>(['avatar', 'cover', 'gallery']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function isMediaKind(value: string): value is MediaKind {
  return value === 'avatar' || value === 'cover' || value === 'gallery' || value === 'resume';
}

function claimedExt(filename: string): string | null {
  const raw = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  if (!raw || !DOC_EXT.has(raw) || raw.includes('/') || raw.includes('\\')) {
    return null;
  }
  return raw;
}

/** Magic-byte sniff so a renamed .exe cannot pass as image/pdf. */
function sniffedExt(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'png';
  }
  if (buf.length >= 6 && buf.subarray(0, 6).toString('ascii') === 'GIF87a') return 'gif';
  if (buf.length >= 6 && buf.subarray(0, 6).toString('ascii') === 'GIF89a') return 'gif';
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  if (buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  // OLE compound (legacy .doc)
  if (
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0
  ) {
    return 'doc';
  }
  // ZIP container used by .docx (and many others) — only accept when claimed.
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) {
    return 'docx';
  }
  return null;
}

export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // userId must be a UUID from the verified JWT, never a value from a cookie.
  if (!/^[0-9a-f-]{36}$/i.test(session.userId)) {
    return NextResponse.json({ message: 'Invalid session' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: 'File too large (max 10MB)' }, { status: 400 });
  }

  const kind = String(formData.get('kind') ?? '');
  if (!isMediaKind(kind)) {
    return NextResponse.json({ message: 'Unsupported upload' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (IMAGE_KINDS.has(kind)) {
    try {
      // Sharp decoding IS the type check here — the filename is not consulted.
      const jpeg =
        kind === 'avatar'
          ? await processAvatarImage(buffer)
          : kind === 'cover'
            ? await processCoverImage(buffer)
            : await processGalleryImage(buffer);

      const saved = await dbPutMedia({
        ownerUserId: session.userId,
        kind,
        extension: 'jpg',
        bytes: jpeg,
      });
      return NextResponse.json({ url: saved.url, id: saved.id });
    } catch (err) {
      if (err instanceof AvatarImageError) {
        return NextResponse.json({ message: err.message }, { status: 400 });
      }
      console.error('[media/upload] could not store image', err);
      return NextResponse.json({ message: 'Could not save photo.' }, { status: 500 });
    }
  }

  const claimed = claimedExt(file.name);
  if (!claimed) {
    return NextResponse.json(
      { message: 'Unsupported file type. Allowed: pdf, doc, docx' },
      { status: 400 },
    );
  }

  const sniffed = sniffedExt(buffer);
  if (!sniffed) {
    return NextResponse.json(
      { message: 'File contents do not match a supported type' },
      { status: 400 },
    );
  }
  // Claimed extension must agree with bytes (docx is ZIP-shaped; claim gates it).
  if (sniffed === 'docx') {
    if (claimed !== 'docx') {
      return NextResponse.json({ message: 'File contents do not match extension' }, { status: 400 });
    }
  } else if (sniffed !== claimed) {
    return NextResponse.json({ message: 'File contents do not match extension' }, { status: 400 });
  }

  try {
    const saved = await dbPutMedia({
      ownerUserId: session.userId,
      kind: 'resume',
      extension: sniffed,
      bytes: buffer,
    });
    return NextResponse.json({ url: saved.url, id: saved.id });
  } catch (err) {
    console.error('[media/upload] could not store document', err);
    return NextResponse.json({ message: 'Could not save file.' }, { status: 500 });
  }
}
