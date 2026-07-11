import { loadJobListings } from '@/lib/explore/loader';
import { ExploreHeader } from '@/components/explore/explore-header';
import { JobsBoard } from '@/components/explore/jobs-board';

export const metadata = {
  title: 'Jobs · Explore · Brigade',
};

export default async function JobsPage() {
  const jobs = await loadJobListings();

  return (
    <div>
      <ExploreHeader
        title="💼 Jobs"
        description="Fresh Toronto hospitality roles across back-of-house, front-of-house, management, hotels and events — curated and refreshed weekly."
      />
      <JobsBoard jobs={jobs} />
    </div>
  );
}
