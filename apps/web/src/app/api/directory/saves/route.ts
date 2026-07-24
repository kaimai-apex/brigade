import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';
import { dbListSavedMemberIds } from '@/lib/server/profile-db';

/** Member ids on the current user's shortlist. */
export async function GET() {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await dbListSavedMemberIds(session.userId));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
