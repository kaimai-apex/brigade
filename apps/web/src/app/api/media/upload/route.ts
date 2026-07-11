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

function safeExt(filename: string): string | null {
  const raw = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  if (!raw || !ALLOWED_EXT.has(raw) || raw.includes('/') || raw.includes('\\')) {
    return null;
  }
  return raw;
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

  const ext = safeExt(file.name);
  if (!ext) {
    return NextResponse.json(
      { message: 'Unsupported file type. Allowed: jpg, png, webp, gif, pdf, doc, docx' },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}.${ext}`;
  const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
  const dir = path.resolve(uploadsRoot, session.userId);
  if (!dir.startsWith(uploadsRoot + path.sep)) {
    return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
  }

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const publicUrl = `/uploads/${session.userId}/${filename}`;
  return NextResponse.json({ url: publicUrl });
}
