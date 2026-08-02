import Link from "next/link";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbListMentors,
  dbGetMentor,
  dbMentorFacets,
  dbPopularMentorRails,
  type MentorSort,
} from "@/lib/server/mentorship-db";
import { MentorSearch } from "@/components/mentorship/mentor-search";
import { CategoryRail } from "@/components/mentorship/category-rail";
import { MentorRail } from "@/components/mentorship/mentor-rail";
import { ExploreCard } from "@/components/mentorship/mentor-card";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORTS = new Set<MentorSort>(["price", "name", "newest"]);

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MentorsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const role = one(sp.role);
  const city = one(sp.city);
  const expertise = one(sp.expertise);
  const sortRaw = one(sp.sort) ?? "price";
  const sort = SORTS.has(sortRaw as MentorSort) ? (sortRaw as MentorSort) : "price";
  const filtering = Boolean(q || role || city || expertise);

  const session = await getConnectProSession();

  const [{ data: mentors, total }, ownMentor, facets, rails] = await Promise.all([
    dbListMentors({ q, role, city, expertise, sort, limit: 36 }),
    session ? dbGetMentor(session.userId) : Promise.resolve(null),
    dbMentorFacets(),
    filtering ? Promise.resolve([]) : dbPopularMentorRails(12),
  ]);

  const active = { q, role, city, expertise, sort };
  const filterCount = [role, city, expertise].filter(Boolean).length + (sort !== "price" ? 1 : 0);

  // Where "become a mentor" leads depends on how far along the reader is.
  // Sending someone who already has a mentor page back through setup, or a
  // logged-out visitor to a page that will bounce them, both waste the click.
  const setupHref = session ? "/mentorship/setup" : "/login?next=/mentorship/setup";
  const emptyCtaHref = ownMentor ? "/sessions" : setupHref;
  const emptyCtaLabel = ownMentor ? "Manage your sessions" : "Become a mentor";

  return (
    <MarketplaceShell>
      <div className="mk-shell py-8">
        <nav aria-label="Breadcrumb" className="text-[14px] text-[var(--mk-muted)]">
          <Link href="/" className="hover:text-[var(--mk-text)]">
            Home
          </Link>
          <span className="mx-2 text-[var(--mk-subtle)]">/</span>
          <span className="text-[var(--mk-text)]">Explore</span>
        </nav>

        <h1 className="mk-display mt-8 max-w-[26ch]">
          Learn from chefs who&apos;ve already done it
        </h1>
        <p className="mk-lede mt-3 max-w-[70ch]">
          Browse verified private chefs, banquet leads, and hospitality operators.
          Book a 1:1 session in minutes — leave with a plan, not just advice.
        </p>

        <div className="mt-8 flex gap-8 border-b border-[var(--mk-line)]">
          <span className="mk-tab" aria-current="true">
            Mentors
          </span>
          <Link
            href={session ? "/sessions" : "/login?next=/sessions"}
            className="mk-tab"
          >
            Group Sessions
          </Link>
        </div>

        <div className="mt-6">
          <MentorSearch
            initialQuery={q ?? ""}
            filters={{ role, city, expertise, sort }}
            filterCount={filterCount}
          />
          <CategoryRail facets={facets} active={active} />
        </div>

        {!filtering && rails.length > 0 && (
          <div className="mt-4 divide-y divide-[var(--mk-line)]">
            {rails.map((rail) => (
              <MentorRail
                key={rail.expertise}
                title={`Popular in ${rail.expertise}`}
                expertise={rail.expertise}
                mentors={rail.mentors}
              />
            ))}
          </div>
        )}

        <p className="mt-8 text-[14px] text-[var(--mk-muted)]" aria-live="polite">
          {total.toLocaleString("en-US")} {total === 1 ? "mentor" : "mentors"}
          {expertise ? ` in ${expertise}` : ""}
          {role ? ` · ${role}` : ""}
          {city ? ` · ${city}` : ""}
        </p>

        {mentors.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[18px] font-semibold text-[var(--mk-text)]">
              {filtering ? "No mentors match that yet." : "No mentors yet."}
            </p>
            <p className="mt-2 text-[15px] text-[var(--mk-muted)]">
              {filtering
                ? "Try a broader search, or clear the filters."
                : "Be the first — publish your sessions and start taking bookings."}
            </p>
            <Link
              href={filtering ? "/mentors" : emptyCtaHref}
              className="mk-btn mk-btn-outline mt-6"
            >
              {filtering ? "Clear everything" : emptyCtaLabel}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mentors.map((m) => (
              <li key={m.userId}>
                <ExploreCard mentor={m} />
              </li>
            ))}
          </ul>
        )}

        {/* The other side of the marketplace. Shown to anyone who is not
            already a mentor — this page is where someone realises they could
            be doing this too, and there was previously no way in from here
            unless the directory happened to be empty. */}
        {!ownMentor && (
          <section className="mt-16 rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-wash)] p-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-[52ch]">
                <h2 className="text-[22px] font-semibold text-[var(--mk-text)]">
                  Teach what you know
                </h2>
                <p className="mt-2 text-[15px] text-[var(--mk-muted)]">
                  You set the price and the hours. Brigade handles booking, payment and
                  reminders, and keeps 20% of each session. Setting up takes about ten
                  minutes.
                </p>
              </div>
              <Link href={setupHref} className="mk-btn mk-btn-dark">
                Become a mentor
              </Link>
            </div>
          </section>
        )}

        {(facets.expertise.length > 0 || facets.cities.length > 0) && (
          <>
            {facets.expertise.length > 0 && (
              <section className="mt-16 border-t border-[var(--mk-line)] pt-8">
                <h2 className="text-[18px] font-semibold text-[var(--mk-text)]">
                  Browse by Expertise
                </h2>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                  {facets.expertise.map((tag) => (
                    <Link
                      key={tag.value}
                      href={`/mentors?expertise=${encodeURIComponent(tag.value)}`}
                      className="text-[15px] text-[var(--mk-muted)] hover:text-[var(--mk-text)]"
                    >
                      {tag.value}
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {facets.cities.length > 0 && (
              <section className="mt-10 border-t border-[var(--mk-line)] pt-8">
                <h2 className="text-[18px] font-semibold text-[var(--mk-text)]">
                  Browse by Location
                </h2>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                  {facets.cities.map((c) => (
                    <Link
                      key={c.value}
                      href={`/mentors?city=${encodeURIComponent(c.value)}`}
                      className="text-[15px] text-[var(--mk-muted)] hover:text-[var(--mk-text)]"
                    >
                      {c.value}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </MarketplaceShell>
  );
}
