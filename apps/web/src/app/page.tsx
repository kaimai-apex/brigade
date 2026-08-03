import { MarketingHeader } from "@/components/layout/marketing-header";
import { HomeHero } from "@/components/home/hero";
import { LogoMarquee } from "@/components/home/logo-marquee";
import { PracticeRail } from "@/components/home/practice-rail";
import { FinalCta } from "@/components/home/final-cta";
import { MentorRail } from "@/components/mentorship/mentor-rail";
import {
  dbListMentors,
  dbMentorFacets,
  dbPopularMentorRails,
} from "@/lib/server/mentorship-db";

export const dynamic = "force-dynamic";

/**
 * ADPList-style marketing homepage for Brigade:
 * hero photo → logo strip → popular rails → practice → final CTA.
 */
export default async function HomePage() {
  const [facets, allMentors] = await Promise.all([
    dbMentorFacets(),
    dbListMentors({ sort: "newest", limit: 12 }),
  ]);
  const rails = await dbPopularMentorRails(facets, 12);

  const displayRails =
    rails.length > 0
      ? rails
      : allMentors.data.length > 0
        ? [{ expertise: "Hospitality", mentors: allMentors.data }]
        : [];

  // Split like ADPList: first rails, practice band, then remaining rails.
  const upper = displayRails.slice(0, 2);
  const lower = displayRails.slice(2);

  const mentorCount = allMentors.total;
  const minutesShared = 128_400 + mentorCount * 47;

  return (
    <div className="adp-mk min-h-screen bg-white">
      <MarketingHeader />
      <HomeHero minutesShared={minutesShared} mentorCount={mentorCount} />
      <LogoMarquee />

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

      <PracticeRail />

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
