import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';
import { dbListConnections, dbSendConnectionRequest } from '@/lib/server/profile-db';

/** List your Brigade connections. ?status=accepted|pending */
export async function GET(request: Request) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const status = new URL(request.url).searchParams.get('status') ?? 'accepted';
  try {
    return NextResponse.json({ data: await dbListConnections(session.userId, status) });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

/** Send a Brigade invitation. */
export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const receiverId = (body as { receiverId?: string }).receiverId;
  if (!receiverId) {
    return NextResponse.json({ message: 'receiverId is required' }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await dbSendConnectionRequest(session.userId, receiverId),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Could not send invitation' },
      { status: 400 },
    );
  }
}
