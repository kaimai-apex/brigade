import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';
import { dbRecordProfileView } from '@/lib/server/profile-db';

/** Record that the current member viewed this profile (self-views are ignored). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await dbRecordProfileView(id, session.userId);
    return NextResponse.json({ recorded: true });
  } catch {
    // View tracking is best-effort — never surface an error to the viewer.
    return NextResponse.json({ recorded: false });
  }
}
