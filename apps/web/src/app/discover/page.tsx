import { redirect } from 'next/navigation';
import { directoryQueryString, parseDirectoryParams } from '@/lib/directory/params';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Discover was renamed to the Member Directory. Preserve any incoming filters. */
export default async function DiscoverRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const qs = directoryQueryString(parseDirectoryParams(sp));
  redirect(qs ? `/directory?${qs}` : '/directory');
}
