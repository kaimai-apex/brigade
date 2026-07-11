import Link from 'next/link';
import { getDiscoverProfiles } from '@/lib/actions/profile';
import { ExploreHeader } from '@/components/explore/explore-header';
import { DiscoverDirectory } from '@/components/discover/discover-directory';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Featured Professionals · Explore · Brigade',
};

export default async function ProfessionalsPage() {
  const profiles = await getDiscoverProfiles();

  return (
    <div>
      <ExploreHeader
        title="👨‍🍳 Featured Professionals"
        description="Founding chefs, sommeliers, bartenders and managers building real profiles on Brigade. Everyone here joined by choice — no auto-created profiles."
      />

      {profiles.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-display text-2xl font-bold">
            The founding class is forming.
          </p>
          <p className="mx-auto mt-3 max-w-md text-ink/65">
            We’re onboarding 25–50 founding hospitality professionals — chefs,
            sommeliers, and GMs from Toronto’s best rooms. Be one of them.
          </p>
          <Button asChild variant="rust" className="mt-6">
            <Link href="/signup">Become a founding member</Link>
          </Button>
        </Card>
      ) : (
        <DiscoverDirectory profiles={profiles} />
      )}
    </div>
  );
}
