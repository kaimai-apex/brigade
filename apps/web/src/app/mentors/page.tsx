import Link from "next/link";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbListMentors,
  dbGetMentor,
  type MentorSort,
} from "@/lib/server/mentorship-db";
import { MentorSearch } from "@/components/mentorship/mentor-search";
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
  const sortRaw = one(sp.sort) ?? "price";
  const sort = SORTS.has(sortRaw as MentorSort) ? (sortRaw as MentorSort) : "price";
  const searching = Boolean(q);

  const session = await getConnectProSession();

  let mentors: Awaited<ReturnType<typeof dbListMentors>>["data"] = [];
  let total = 0;
  let ownMentor: Awaited<ReturnType<typeof dbGetMentor>> = null;
  try {
    [{ data: mentors, total }, ownMentor] = await Promise.all([
      dbListMentors({ q, sort, limit: 100 }),
      session ? dbGetMentor(session.userId) : Promise.resolve(null),
    ]);
  } catch (err) {
    console.error("[mentors] query failed; rendering empty marketplace", err);
  }

  const setupHref = session ? "/mentorship/setup" : "/login?next=/mentorship/setup";
  const emptyCtaHref = ownMentor ? "/sessions" : setupHref;
  const emptyCtaLabel = ownMentor ? "View sessions" : "Become a mentor";

  return (
    <MarketplaceShell>
      <div className="mk-shell py-8">
        <nav aria-label="Breadcrumb" className="text-[14px] text-[var(--mk-muted)]">
          <Link href="/" className="hover:text-[var(--mk-text)]">
            Home
          </Link>
          <span className="mx-2 text-[var(--mk-muted)]">/</span>
          <span className="text-[var(--mk-text)]">Explore</span>
        </nav>

        <h1 className="mk-display mt-8 max-w-[26ch]">
          Learn from private chefs who&apos;ve already done it
        </h1>
        <p className="mk-lede mt-3 max-w-[70ch]">
          Private chefs who cook for households, estates, yachts and villas. Book a 1:1
          session in minutes — leave with a plan, not just advice.
        </p>

        <div className="mt-8">
          <MentorSearch initialQuery={q ?? ""} sort={sort} />
        </div>

        <p className="mt-8 text-[14px] text-[var(--mk-muted)]" aria-live="polite">
          {total.toLocaleString("en-US")} {total === 1 ? "mentor" : "mentors"}
          {searching ? " matching your search" : ""}
        </p>

        {mentors.length === 0 ? (
          <div className="py-16 text-center sm:py-20">
            <p className="text-[18px] font-semibold text-[var(--mk-text)]">
              {searching ? "No mentors match that yet." : "No mentors published yet."}
            </p>
            <p className="mx-auto mt-2 max-w-[42ch] text-[15px] text-[var(--mk-muted)]">
              {searching
                ? "Try another name or clear the search to see everyone."
                : "Publish your mentor card with a Calendly link. Setting up takes a couple of minutes."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {searching && (
                <Link href="/mentors" className="mk-btn mk-btn-outline">
                  Clear search
                </Link>
              )}
              <Link href={emptyCtaHref} className="mk-btn mk-btn-dark">
                {emptyCtaLabel}
              </Link>
            </div>
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

        {!ownMentor && mentors.length > 0 && (
          <section className="mt-16 rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-wash)] p-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-[52ch]">
                <h2 className="text-[22px] font-semibold text-[var(--mk-text)]">
                  Teach what you know
                </h2>
                <p className="mt-2 text-[15px] text-[var(--mk-muted)]">
                  If you cook privately, someone is trying to work out how you did it.
                  Add your Calendly link; Brigade handles payment and reminders, and
                  keeps 20%. Setting up takes a couple of minutes.
                </p>
              </div>
              <Link href={setupHref} className="mk-btn mk-btn-dark">
                Become a mentor
              </Link>
            </div>
          </section>
        )}
      </div>
    </MarketplaceShell>
  );
}
