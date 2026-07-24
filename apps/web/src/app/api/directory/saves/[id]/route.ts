import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';
import { dbSaveMember, dbUnsaveMember } from '@/lib/server/profile-db';

async function requireSession() {
  const session = await getConnectProSession();
  return session?.userId ?? null;
}

/** Save a member to your shortlist. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireSession();
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    return NextResponse.json(await dbSaveMember(userId, id));
  } catch {
    return NextResponse.json({ message: 'Could not save member' }, { status: 500 });
  }
}

/** Remove a member from your shortlist. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireSession();
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    return NextResponse.json(await dbUnsaveMember(userId, id));
  } catch {
    return NextResponse.json({ message: 'Could not update saved list' }, { status: 500 });
  }
}
