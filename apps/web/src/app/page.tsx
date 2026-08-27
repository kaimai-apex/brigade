import { MarketingHeader } from "@/components/layout/marketing-header";
import { HomeHero } from "@/components/home/hero";
import { PathLadder } from "@/components/home/path-ladder";
import { HomeJournal } from "@/components/home/home-journal";
import { AcceleratorSection } from "@/components/home/accelerator";
import { OneOnOneSection } from "@/components/home/one-on-one";
import { FinalCta } from "@/components/home/final-cta";
import { HomeMemberDirectory } from "@/components/home/member-directory";
import { dbListMentors } from "@/lib/server/mentorship-db";
import { isTestOrDebugProfile } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Marketing homepage. Learn (free) → Build (cohort) → Launch, with 1:1
 * as the rung above the Accelerator. Members sit under that story as
 * proof that real chefs are already here.
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
      <PathLadder />
      <HomeJournal />
      <AcceleratorSection />
      <OneOnOneSection />
      <HomeMemberDirectory members={members} />
      <FinalCta />
    </div>
  );
}
