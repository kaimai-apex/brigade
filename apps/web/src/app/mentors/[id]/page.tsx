import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { getPool } from "@connectpro/common";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbGetMentor,
  dbListSessionTypes,
  dbListAvailabilityRules,
  dbListMentors,
} from "@/lib/server/mentorship-db";
import { paymentsConfigured } from "@/lib/server/payments";
import { resolveAvatarUrl } from "@/lib/avatars";
import { BookingPanel } from "@/components/mentorship/booking-panel";
import { MentorRail } from "@/components/mentorship/mentor-rail";

export const dynamic = "force-dynamic";

export default async function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getConnectProSession();

  const mentor = await dbGetMentor(id);
  if (!mentor || mentor.status === "draft") notFound();

  const [sessionTypes, rules, profileRes] = await Promise.all([
    dbListSessionTypes(id),
    dbListAvailabilityRules(id),
    getPool().query(
      `SELECT first_name, last_name, headline, role, city, state, country, avatar_url,
              about, expertise_areas, current_employer, years_experience, cover_url
       FROM users.profiles WHERE user_id = $1`,
      [id],
    ),
  ]);

  const profile = profileRes.rows[0];
  if (!profile) notFound();

  const name =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Brigade Member";
  const place = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");
  const isSelf = session?.userId === id;
  // What they said they TEACH wins over what their member profile says they do.
  // Falls back to the profile so mentors who joined before mentor-owned tags
  // existed still show something — matches how the directory filters and
  // facets resolve it (EFFECTIVE_EXPERTISE in mentorship-db.ts).
  const profileAreas: string[] = Array.isArray(profile.expertise_areas)
    ? profile.expertise_areas
    : [];
  const expertiseAreas: string[] = mentor.expertise.length > 0 ? mentor.expertise : profileAreas;
  const relatedExpertise = expertiseAreas[0] ?? profile.role ?? null;

  const related = relatedExpertise
    ? (
        await dbListMentors({
          expertise: expertiseAreas[0] ? relatedExpertise : undefined,
          role: expertiseAreas[0] ? undefined : relatedExpertise,
          sort: "newest",
          limit: 8,
        })
      ).data.filter((m) => m.userId !== id)
    : [];

  const titleLine = [profile.role, profile.current_employer].filter(Boolean);
  const cover = typeof profile.cover_url === "string" ? profile.cover_url : null;

  return (
    <MarketplaceShell>
      <div className="mk-shell py-8">
        <nav aria-label="Breadcrumb" className="text-[14px] text-[var(--mk-muted)]">
          <Link href="/mentors" className="hover:text-[var(--mk-text)]">
            Home
          </Link>
          <span className="mx-2 text-[var(--mk-subtle)]">/</span>
          <Link href="/mentors" className="hover:text-[var(--mk-text)]">
            Explore
          </Link>
          <span className="mx-2 text-[var(--mk-subtle)]">/</span>
          <span className="text-[var(--mk-text)]">{name}</span>
        </nav>

        <header className="mt-6">
          <div className="relative h-[180px] overflow-hidden rounded-2xl bg-[var(--mk-avatar-bg)] md:h-[230px]">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>

          <div className="relative -mt-14 flex flex-wrap items-end gap-6 px-1 md:-mt-16 md:px-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveAvatarUrl(profile.avatar_url, id)}
              alt=""
              width={148}
              height={148}
              className="size-[148px] shrink-0 rounded-2xl border-4 border-[var(--brand-white)] bg-[var(--mk-avatar-bg)] object-cover shadow-[var(--mk-shadow-card)]"
            />

            <div className="min-w-0 flex-1 pb-2">
              <h1 className="flex flex-wrap items-center gap-2 text-[30px] font-semibold leading-tight text-[var(--mk-text)] md:text-[34px]">
                {name}
              </h1>
              {(titleLine.length > 0 || mentor.headline || profile.headline) && (
                <p className="mt-1.5 max-w-[60ch] text-[18px] leading-snug text-[var(--mk-text)]">
                  {titleLine.length > 0 ? (
                    <>
                      {profile.role}
                      {profile.role && profile.current_employer && (
                        <span className="text-[var(--mk-muted)]"> at </span>
                      )}
                      {profile.current_employer}
                    </>
                  ) : (
                    mentor.headline ?? profile.headline
                  )}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-[var(--mk-subtle)]">
                {place && <span>{place}</span>}
                {profile.years_experience != null && (
                  <span>
                    {Number(profile.years_experience) === 1
                      ? "1 year experience"
                      : `${profile.years_experience} years experience`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-10 flex gap-8 overflow-x-auto border-b border-[var(--mk-line)] mk-no-scrollbar">
          <span className="mk-tab text-[16px]" aria-current="true">
            Overview
          </span>
          <span className="mk-tab text-[16px]">Sessions</span>
        </div>

        <div className="grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-6">
            {expertiseAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {expertiseAreas.map((tag) => (
                  <Link
                    key={tag}
                    href={`/mentors?expertise=${encodeURIComponent(tag)}`}
                    className="mk-chip"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {mentor.bio && (
              <section className="mk-card p-6">
                <h2 className="text-[18px] font-semibold text-[var(--mk-text)]">
                  About these sessions
                </h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[var(--mk-muted)]">
                  {mentor.bio}
                </p>
              </section>
            )}

            {profile.about && (
              <section className="mk-card p-6">
                <h2 className="text-[18px] font-semibold text-[var(--mk-text)]">
                  About {profile.first_name ?? name}
                </h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[var(--mk-muted)]">
                  {profile.about}
                </p>
              </section>
            )}

            <section className="mk-card p-6">
              <h2 className="text-[18px] font-semibold text-[var(--mk-text)]">
                Typical availability
              </h2>
              {rules.length === 0 ? (
                <p className="mt-3 text-[15px] text-[var(--mk-muted)]">No hours published yet.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-[15px] text-[var(--mk-muted)]">
                  {rules.map((r, i) => (
                    <li key={i} className="flex flex-wrap gap-x-2">
                      <span className="font-medium text-[var(--mk-text)]">{WEEKDAYS[r.weekday]}</span>
                      <span>
                        {minutesToLabel(r.startMinute)}–{minutesToLabel(r.endMinute)}
                      </span>
                      <span className="text-[var(--mk-subtle)]">
                        ({mentor.timezone.replace(/_/g, " ")})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--mk-header-h)+1rem)] lg:self-start">
            <BookingPanel
              mentorUserId={id}
              mentorName={name}
              currency={mentor.currency}
              timezone={mentor.timezone}
              sessionTypes={sessionTypes}
              isSelf={isSelf}
              paymentsEnabled={paymentsConfigured()}
              paused={mentor.status === "paused"}
            />
          </aside>
        </div>

        {related.length > 0 && relatedExpertise && (
          <div className="border-t border-[var(--mk-line)]">
            <MentorRail
              title={`More in ${relatedExpertise}`}
              expertise={relatedExpertise}
              mentors={related}
            />
          </div>
        )}
      </div>
    </MarketplaceShell>
  );
}

const WEEKDAYS = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];

function minutesToLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
