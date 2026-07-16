import { Suspense } from "react";
import { ServerAppPage } from "@/components/layout/server-app-page";
import { DiscoverDirectory } from "@/components/discover/discover-directory";
import { getDiscoverProfiles } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isTestOrDebugProfile } from "@/lib/utils";
import Link from "next/link";

export default async function DiscoverPage() {
  const raw = await getDiscoverProfiles();
  const profiles = raw.filter((p) => !isTestOrDebugProfile(p));

  return (
    <ServerAppPage className="pb-4 pt-4">
      <h1 className="text-page-title mb-4">Discover</h1>

      {profiles.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero/chef-cutlery.jpg"
            alt=""
            className="h-28 w-28 rounded-2xl object-cover mix-blend-multiply"
          />
          <p className="text-section-title">No one here yet</p>
          <p className="text-body-md text-ink/65">
            Be the first chef, bartender, or event pro to show up.
          </p>
          <Button asChild className="mt-1 w-full max-w-xs">
            <Link href="/settings/profile">Complete your profile</Link>
          </Button>
        </Card>
      ) : (
        <Suspense fallback={<p className="text-meta text-ink/50">Loading…</p>}>
          <DiscoverDirectory profiles={profiles} />
        </Suspense>
      )}
    </ServerAppPage>
  );
}
