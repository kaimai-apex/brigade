import { ServerAppPage } from '@/components/layout/server-app-page';
import { getDirectory, getSavedMemberIds } from '@/lib/actions/profile';
import {
  DIRECTORY_PAGE_SIZE,
  parseDirectoryParams,
} from '@/lib/directory/params';
import { isTestOrDebugProfile } from '@/lib/utils';
import { DirectoryView } from '@/components/directory/directory-view';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = { ...parseDirectoryParams(sp), limit: DIRECTORY_PAGE_SIZE, offset: 0 };

  const [result, savedIds] = await Promise.all([
    getDirectory(params),
    getSavedMemberIds(),
  ]);

  const profiles = result.profiles.filter((p) => !isTestOrDebugProfile(p));
  const cityCount = new Set(
    result.facets.cities.map((c) => c.value).filter(Boolean),
  ).size;

  return (
    <ServerAppPage wide className="pt-4">
      <div className="mb-4">
        <h1 className="text-page-title">Member Directory</h1>
        <p className="text-body-md text-ink/60">
          {result.total > 0
            ? `${result.total} hospitality ${result.total === 1 ? 'pro' : 'pros'}${
                cityCount > 1 ? ` across ${cityCount} cities` : ''
              } — find and connect with your Brigade.`
            : 'Find and connect with hospitality pros in your Brigade.'}
        </p>
      </div>

      <DirectoryView
        initialProfiles={profiles}
        total={result.total}
        facets={result.facets}
        params={parseDirectoryParams(sp)}
        savedIds={savedIds}
      />
    </ServerAppPage>
  );
}
