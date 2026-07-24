import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';
import { dbGetProfile, dbUpdateProfile } from '@/lib/server/profile-db';

/** Read a profile. Reads Postgres directly so it works without the microservices. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const profile = await dbGetProfile(id);
    if (!profile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ message: 'Could not load profile' }, { status: 500 });
  }
}

/** Update your own profile. Members may only edit themselves. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (id !== session.userId) {
    return NextResponse.json(
      { message: 'You can only edit your own profile' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  try {
    const updated = await dbUpdateProfile(id, body as Record<string, unknown>);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: 'Could not save profile' }, { status: 500 });
  }
}
