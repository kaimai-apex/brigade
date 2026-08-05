import Link from "next/link";
import { redirect } from "next/navigation";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbGetProfile, dbUpdateProfile } from "@/lib/server/profile-db";
import { dbListMentorSignals, dbListMentorsByIds, dbListMentors } from "@/lib/server/mentorship-db";
import { rankMentors, summariseReasons, type MatchResult } from "@/lib/onboarding/matching";
import { minYearsForPreference } from "@/lib/onboarding/taxonomy";
import { ExploreCard } from "@/components/mentorship/mentor-card";
import { CompletionCelebration } from "@/components/onboarding/completion-celebration";

export const dynamic = "force-dynamic";

/**
 * The end of onboarding: who we think you should talk to.
 *
 * There is no artificial delay and no "analysing your profile…" theatre. The
 * ranking is a scored comparison over a list we already have, it takes
 * milliseconds, and pretending otherwise to seem clever would be the first
 * thing we ever lied to a new member about.
 *
 * When the ranking is not confident — they told us nothing to match on, or too
 * few mentors cleared the bar — this says so and shows the directory instead.
 * A "picked just for you" heading over three arbitrary cards is worse than an
 * honest browse.
 */
export default async function RecommendationsPage() {
  const session = await getConnectProSession();
  if (!session) redirect("/login?next=/onboarding");

  const profile = await dbGetProfile(session.userId);
  if (!profile) redirect("/onboarding");

  // Reaching this screen IS finishing onboarding. Marked here rather than
  // behind a button, so someone who closes the tab is not sent back to step one.
  if (!profile.onboardingCompleted) {
    await dbUpdateProfile(session.userId, { onboardingCompleted: true });
  }

  const mentee = {
    skillsWanted: (profile.skillsWanted as string[]) ?? [],
    helpWanted: (profile.helpWanted as string[]) ?? [],
    interestIndustries: (profile.interestIndustries as string[]) ?? [],
    languages: (profile.languages as string[]) ?? [],
    timezone: (profile.timezone as string) ?? null,
    minMentorYears: minYearsForPreference(profile.preferredMentorExperience as string | null),
    experienceLevel: (profile.experienceLevel as string) ?? null,
  };

  const signals = await dbListMentorSignals();
  // A mentor cannot be recommended to themselves.
  const { matches, confident, reason } = rankMentors(
    mentee,
    signals.filter((signal) => signal.userId !== session.userId),
  );

  const ranked = await dbListMentorsByIds(matches.map((match) => match.mentorUserId));
  const reasonById = new Map<string, MatchResult>(
    matches.map((match) => [match.mentorUserId, match]),
  );

  // The fallback is the real directory, not an empty state.
  const browse = confident
    ? []
    : (await dbListMentors({ sort: "newest", limit: 12 })).data.filter(
        (listing) => listing.userId !== session.userId,
      );

  const firstName = (profile.preferredName as string) || (profile.firstName as string) || "there";

  return (
    <div>
      <CompletionCelebration label="All set · 100%" />

      <h1 className="font-display mt-8 text-2xl font-black leading-tight text-ink sm:text-3xl">
        {confident ? `Here's who we'd start with, ${firstName}` : `You're all set, ${firstName}`}
      </h1>

      {/* One sentence per reason. Saying "we are still building up our mentor
          list" to someone browsing two hundred mentors is worse than saying
          nothing, and that is exactly what a single fallback string produced. */}
      <p className="mt-2 text-[15px] text-ink/60">
        {reason === "confident" &&
          "Matched on what you said you want to work on. Each card says why."}
        {reason === "few-matches" &&
          "We found a few people worth a look, but not enough to call them a shortlist yet — so here is everyone."}
        {reason === "no-answers" && (
          <>
            You skipped the questions about what you want to work on, so this is just
            everyone.{" "}
            <Link href="/onboarding?step=skills" className="underline underline-offset-4">
              Answer them
            </Link>{" "}
            and we can narrow it down.
          </>
        )}
        {reason === "no-mentors" &&
          "Nobody is taking bookings yet. Have a look around, and we will let you know when someone starts."}
      </p>

      {confident ? (
        <ul className="mt-6 space-y-4">
          {ranked.map((listing) => {
            const match = reasonById.get(listing.userId);
            return (
              <li key={listing.userId}>
                <div className="rounded-2xl border border-ink/10 p-3">
                  <ExploreCard mentor={listing} />
                  {match && match.reasons.length > 0 && (
                    <div className="mt-3 px-1">
                      <p className="text-meta font-semibold text-forest">
                        {summariseReasons(match.reasons)}
                      </p>
                      <p className="text-meta mt-1 text-ink/65">
                        {match.reasons
                          .filter((reason) => reason.label)
                          .map((reason) => reason.label)
                          .join(" · ")}
                      </p>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(browse.length > 0 ? browse : ranked).map((listing) => (
            <li key={listing.userId}>
              <ExploreCard mentor={listing} />
            </li>
          ))}
        </ul>
      )}

      {ranked.length === 0 && browse.length === 0 && (
        <p className="mt-6 rounded-xl border border-ink/10 bg-ink/[0.02] p-4 text-[15px] text-ink/60">
          No mentors are taking bookings yet. We will email you when someone in your area
          starts — or you could be the first.
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3 border-t border-neutral-100 pt-6">
        <Link href="/mentors" className="mk-btn mk-btn-dark">
          Browse all mentors
        </Link>
        <Link href="/settings/profile" className="mk-btn">
          Finish your profile
        </Link>
        <Link href="/directory" className="mk-btn">
          Browse members
        </Link>
      </div>

      <p className="text-meta mt-4 text-ink/65">
        Your answers shape these suggestions. You can change them any time in{" "}
        <Link href="/settings/profile" className="underline underline-offset-4">
          settings
        </Link>
        .
      </p>
    </div>
  );
}
