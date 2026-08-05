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
          {/* "Connect with your Brigade" described a social graph that no
              longer exists — there is nothing to connect to. What the directory
              is for now is finding the person who has already done the thing
              you are trying to do. */}
          {result.total > 0
            ? `${result.total} private ${result.total === 1 ? 'chef' : 'chefs'}${
                cityCount > 1 ? ` across ${cityCount} cities` : ''
              }. Find someone who has cooked the job you want.`
            : 'Find a private chef who has cooked the job you want.'}
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
