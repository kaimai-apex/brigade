import { MarketingHeader } from "@/components/layout/marketing-header";
import { HomeHero } from "@/components/home/hero";
import { FinalCta } from "@/components/home/final-cta";
import { MentorRail } from "@/components/mentorship/mentor-rail";
import {
  dbListMentors,
  dbMentorFacets,
  dbPopularMentorRails,
} from "@/lib/server/mentorship-db";

export const dynamic = "force-dynamic";

/**
 * Marketing homepage. Mentor rails come straight from the database — if there
 * are no published mentors, those bands simply do not render.
 */
export default async function HomePage() {
  let facets: Awaited<ReturnType<typeof dbMentorFacets>> = {
    roles: [],
    cities: [],
    expertise: [],
  };
  let allMentors: Awaited<ReturnType<typeof dbListMentors>> = { data: [], total: 0 };
  let rails: Awaited<ReturnType<typeof dbPopularMentorRails>> = [];
  try {
    [facets, allMentors] = await Promise.all([
      dbMentorFacets(),
      dbListMentors({ sort: "newest", limit: 12 }),
    ]);
    rails = await dbPopularMentorRails(facets, 12);
  } catch (err) {
    console.error("[home] mentorship query failed; rendering without rails", err);
  }

  const displayRails =
    rails.length > 0
      ? rails
      : allMentors.data.length > 0
        ? [{ expertise: "Private cheffing", mentors: allMentors.data }]
        : [];

  const upper = displayRails.slice(0, 2);
  const lower = displayRails.slice(2);

  return (
    <div className="adp-mk min-h-screen bg-white">
      <MarketingHeader />
      <HomeHero />

      {upper.length > 0 && (
        <div className="mk-shell">
          {upper.map((rail) => (
            <MentorRail
              key={rail.expertise}
              title={`Popular in ${rail.expertise}`}
              expertise={rail.expertise}
              mentors={rail.mentors}
            />
          ))}
        </div>
      )}

      {lower.length > 0 && (
        <div className="mk-shell">
          {lower.map((rail) => (
            <MentorRail
              key={rail.expertise}
              title={`Popular in ${rail.expertise}`}
              expertise={rail.expertise}
              mentors={rail.mentors}
            />
          ))}
        </div>
      )}

      <FinalCta />
    </div>
  );
}
