import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getConnectProSession } from '@/lib/connectpro/server';

export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'No file provided' }, { status: 400 });
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', session.userId);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const publicUrl = `/uploads/${session.userId}/${filename}`;
  return NextResponse.json({ url: publicUrl });
}
