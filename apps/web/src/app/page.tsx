import { MarketingHeader } from "@/components/layout/marketing-header";
import { HomeHero } from "@/components/home/hero";
import { FinalCta } from "@/components/home/final-cta";
import { HomeMemberDirectory } from "@/components/home/member-directory";
import { dbListMentors } from "@/lib/server/mentorship-db";
import { isTestOrDebugProfile } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Marketing homepage. Members render as one directory under the hero —
 * no category rails, filters, or "Show all" splits.
 */
export default async function HomePage() {
  let members: Awaited<ReturnType<typeof dbListMentors>>["data"] = [];
  try {
    const listed = await dbListMentors({ sort: "newest", limit: 200 });
    members = listed.data.filter(
      (m) =>
        !isTestOrDebugProfile({
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
          headline: m.headline,
        }),
    );
  } catch (err) {
    console.error("[home] mentorship query failed; rendering without directory", err);
  }

  return (
    <div className="adp-mk min-h-screen bg-white">
      <MarketingHeader />
      <HomeHero />
      <HomeMemberDirectory members={members} />
      <FinalCta />
    </div>
  );
}
