import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';
import { dbRespondToConnection } from '@/lib/server/profile-db';

/** Accept or reject a Brigade invitation: POST /api/connections/:id/accept|reject */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id, action } = await params;
  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ message: 'Unknown action' }, { status: 404 });
  }

  try {
    const result = await dbRespondToConnection(
      id,
      session.userId,
      action === 'accept' ? 'accepted' : 'rejected',
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Could not update invitation' },
      { status: 400 },
    );
  }
}
