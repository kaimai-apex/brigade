import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getConnectProSession } from '@/lib/connectpro/server';

const ALLOWED_EXT = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'pdf',
  'doc',
  'docx',
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function claimedExt(filename: string): string | null {
  const raw = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  if (!raw || !ALLOWED_EXT.has(raw) || raw.includes('/') || raw.includes('\\')) {
    return null;
  }
  return raw === 'jpeg' ? 'jpg' : raw;
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

  // userId must be a UUID from verified JWT — never a path segment from a cookie.
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

  const claimed = claimedExt(file.name);
  if (!claimed) {
    return NextResponse.json(
      { message: 'Unsupported file type. Allowed: jpg, png, webp, gif, pdf, doc, docx' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
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

  const ext = sniffed;
  const filename = `${randomUUID()}.${ext}`;
  const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
  const dir = path.resolve(uploadsRoot, session.userId);
  if (!dir.startsWith(uploadsRoot + path.sep)) {
    return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
  }

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  const publicUrl = `/uploads/${session.userId}/${filename}`;
  return NextResponse.json({ url: publicUrl });
}
