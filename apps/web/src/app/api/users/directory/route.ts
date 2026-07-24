import { NextResponse } from 'next/server';
import { getConnectProSession } from '@/lib/connectpro/server';
import { parseDirectoryParams, DIRECTORY_PAGE_SIZE } from '@/lib/directory/params';
import { dbListDirectory } from '@/lib/server/profile-db';

/** Directory page fetch (powers load-more / infinite scroll). Reads Postgres directly. */
export async function GET(request: Request) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = parseDirectoryParams(url.searchParams);
  const limit = Number(url.searchParams.get('limit')) || DIRECTORY_PAGE_SIZE;
  const offset = Number(url.searchParams.get('offset')) || 0;

  try {
    const result = await dbListDirectory({ ...params, limit, offset });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { message: 'Could not load the directory' },
      { status: 500 },
    );
  }
}
