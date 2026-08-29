import { MarketingHeader } from "@/components/layout/marketing-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { HomeHero } from "@/components/home/hero";
import { PathLadder } from "@/components/home/path-ladder";
import { AcceleratorSection } from "@/components/home/accelerator";
import { FinalCta } from "@/components/home/final-cta";
import { HomeMemberDirectory } from "@/components/home/member-directory";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbListMentors } from "@/lib/server/mentorship-db";
import { isTestOrDebugProfile } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Marketing homepage. Learn (free, behind an account) → Build (cohort)
 * → Launch. Members sit under that story as proof that real chefs are
 * already here.
 */
export default async function HomePage() {
  const session = await getConnectProSession();
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
    <div className="adp-mk min-h-screen overflow-x-hidden bg-white">
      <MarketingHeader />
      <HomeHero />
      <PathLadder learnHref={session ? "/learn" : undefined} />
      <AcceleratorSection />
      <HomeMemberDirectory members={members} />
      <FinalCta />
      <SiteFooter signedIn={Boolean(session)} />
    </div>
  );
}
