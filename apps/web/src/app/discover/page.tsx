import { ServerAppPage } from "@/components/layout/server-app-page";
import { DiscoverDirectory } from "@/components/discover/discover-directory";
import { getDiscoverProfiles } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function DiscoverPage() {
  const profiles = await getDiscoverProfiles();

  return (
    <ServerAppPage className="pb-20">
      <div className="py-10">
        <p className="font-body text-sm font-extrabold uppercase tracking-widest text-rust">
          Discover
        </p>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight md:text-5xl">
          Find hospitality talent
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">
          Search by role, specialty, and availability — bartenders open this weekend,
          chefs with fine-dining experience, staff ready for emergency shifts.
        </p>
      </div>

      {profiles.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-display text-2xl font-bold">
            Explore hospitality professionals and grow your network.
          </p>
          <p className="mt-3 text-ink/65">
            Be the first chef, bartender, or event pro to show up here.
          </p>
          <Button asChild variant="rust" className="mt-6">
            <Link href="/signup">Create your profile</Link>
          </Button>
        </Card>
      ) : (
        <DiscoverDirectory profiles={profiles} />
      )}
    </ServerAppPage>
  );
}
