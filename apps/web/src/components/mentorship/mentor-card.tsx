import Link from "next/link";
import { resolveAvatarUrl } from "@/lib/avatars";
import { formatMoney } from "@/lib/mentorship/pricing";
import type { MentorListing } from "@/lib/server/mentorship-db";

const NEW_MENTOR_DAYS = 30;

const FLAG: Record<string, string> = {
  US: "🇺🇸",
  USA: "🇺🇸",
  GB: "🇬🇧",
  UK: "🇬🇧",
  CA: "🇨🇦",
  AU: "🇦🇺",
  FR: "🇫🇷",
  MX: "🇲🇽",
  IT: "🇮🇹",
  ES: "🇪🇸",
  DE: "🇩🇪",
  JP: "🇯🇵",
};

function displayName(m: MentorListing) {
  return [m.firstName, m.lastName].filter(Boolean).join(" ") || "Brigade Member";
}

function placeLabel(m: MentorListing) {
  return [m.city, m.state].filter(Boolean).join(", ");
}

function countryLabel(m: MentorListing) {
  if (!m.country) return placeLabel(m) || "United States";
  const c = m.country.trim();
  if (c.length === 2) {
    const names: Record<string, string> = {
      US: "United States",
      GB: "United Kingdom",
      CA: "Canada",
      AU: "Australia",
      FR: "France",
      MX: "Mexico",
    };
    return names[c.toUpperCase()] ?? c;
  }
  return c;
}

function flagFor(m: MentorListing) {
  if (!m.country) return null;
  return FLAG[m.country.trim().toUpperCase()] ?? null;
}

function isNewMentor(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created < NEW_MENTOR_DAYS * 24 * 60 * 60 * 1000;
}

function experienceLabel(years: number | null) {
  if (years === null || years === undefined) return "—";
  if (years <= 0) return "Under 1 year";
  if (years === 1) return "1 year";
  return `${years} years`;
}

function sessionCountLabel(n: number) {
  return n === 1 ? "1 session" : `${n} sessions`;
}

/** Compact card for horizontal "Popular in …" rails — ADPList RailCard. */
export function RailCard({ mentor }: { mentor: MentorListing }) {
  const name = displayName(mentor);
  const flag = flagFor(mentor);
  const country = countryLabel(mentor);

  return (
    <Link href={`/mentors/${mentor.userId}`} className="group w-[208px] shrink-0 snap-start">
      <div className="relative overflow-hidden rounded-2xl bg-[var(--mk-avatar-bg)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveAvatarUrl(mentor.avatarUrl, mentor.userId)}
          alt=""
          width={208}
          height={208}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {isNewMentor(mentor.createdAt) ? (
          <span className="absolute left-2.5 top-2.5">
            <span className="mk-badge">New</span>
          </span>
        ) : mentor.sessionCount >= 5 ? (
          <span className="absolute left-2.5 top-2.5">
            <span className="mk-badge">Top rated</span>
          </span>
        ) : null}
      </div>

      <div className="pt-3">
        <p className="truncate text-[15px] font-semibold text-[var(--mk-text)]">
          {name} {flag ? <span className="select-none">{flag}</span> : null}
        </p>
        {mentor.role && (
          <p className="mt-0.5 truncate text-[14px] text-[var(--mk-text)]">{mentor.role}</p>
        )}
        {mentor.currentEmployer && (
          <p className="truncate text-[14px] text-[var(--mk-muted)]">{mentor.currentEmployer}</p>
        )}
        <p className="mt-1.5 truncate text-[13px] text-[var(--mk-subtle)]">
          {sessionCountLabel(mentor.sessionCount)} · {country}
        </p>
      </div>
    </Link>
  );
}

/** Explore grid card — ADPList ExploreCard layout. */
export function ExploreCard({ mentor }: { mentor: MentorListing }) {
  const name = displayName(mentor);
  const place = placeLabel(mentor);
  const flag = flagFor(mentor);
  const experience = experienceLabel(mentor.yearsExperience);

  return (
    <Link
      href={`/mentors/${mentor.userId}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface)] transition-shadow hover:shadow-[var(--mk-shadow-lift)]"
    >
      <div className="relative overflow-hidden bg-[var(--mk-avatar-bg)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveAvatarUrl(mentor.avatarUrl, mentor.userId)}
          alt=""
          width={320}
          height={320}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {isNewMentor(mentor.createdAt) && <span className="mk-badge mk-badge-purple">New</span>}
          {mentor.fromPriceCents != null && mentor.fromPriceCents > 0 && (
            <span className="mk-badge mk-badge-gold">
              from {formatMoney(mentor.fromPriceCents, mentor.currency)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="truncate text-[16px] font-semibold text-[var(--mk-text)]">
          {name} {flag ? <span className="select-none">{flag}</span> : null}
        </p>
        <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-[var(--mk-muted)]">
          {[mentor.role, mentor.currentEmployer].filter(Boolean).join(" at ") ||
            mentor.headline ||
            "Hospitality mentor"}
        </p>
        <p className="mt-2 text-[13px] text-[var(--mk-subtle)]">
          {sessionCountLabel(mentor.sessionCount)}
          {place ? ` · ${place}` : ""}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-[var(--mk-line)] pt-3 text-[13px]">
          <div>
            <p className="text-[var(--mk-subtle)]">Experience</p>
            <p className="font-semibold text-[var(--mk-text)]">{experience}</p>
          </div>
          <div>
            <p className="text-[var(--mk-subtle)]">Sessions</p>
            <p className="font-semibold text-[var(--mk-text)]">{mentor.sessionCount}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
