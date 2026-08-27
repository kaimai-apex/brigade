import type { Metadata } from "next";
import Link from "next/link";
import { JournalShell } from "@/components/journal/journal-shell";
import { ResourceGate } from "@/components/journal/resource-gate";
import { CohortNudge } from "@/components/home/cohort-nudge";
import { viewerHasResourceAccess } from "@/lib/journal/access";
import {
  articlePath,
  featuredArticle,
  formatJournalDate,
  listArticles,
} from "@/lib/journal/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal · Brigade",
  description:
    "Jordan on the lanes, the money, the list, and the part restaurants never put on the ticket.",
};

export default async function JournalIndexPage() {
  const unlocked = await viewerHasResourceAccess();
  const featured = featuredArticle();
  const rest = listArticles().filter((a) => a.slug !== featured.slug);

  return (
    <JournalShell>
      <div className="mx-auto max-w-[960px]">
        <p className="text-[12px] font-semibold tracking-[0.08em] text-[var(--brand-forest)]">
          JOURNAL
        </p>
        <h1 className="font-display mt-3 max-w-[18ch] text-[36px] font-bold leading-[1.1] tracking-tight md:text-[42px]">
          How the house actually works.
        </h1>
        <p className="mt-4 max-w-[46ch] text-[18px] leading-relaxed text-[var(--brand-ink-muted)]">
          Jordan on the lanes, the money, the list, and the part restaurants
          never put on the ticket.
        </p>

        {unlocked ? (
          <>
            <Link
              href={articlePath(featured.slug)}
              className="mt-10 block rounded-2xl bg-[var(--brand-cream)] px-6 py-8 transition hover:brightness-[0.98] md:px-9 md:py-10"
            >
              <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--brand-forest)]">
                FEATURED
              </p>
              <p className="mt-3 text-[12px] font-medium tracking-[0.08em] text-[var(--brand-forest)]">
                {featured.kicker}
              </p>
              <h2 className="font-display mt-2 text-[28px] font-bold leading-tight tracking-tight md:text-[36px]">
                {featured.title}
              </h2>
              <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-[var(--brand-ink-muted)]">
                {featured.dek}
              </p>
              <p className="mt-4 text-[14px] text-[var(--brand-ink-subtle)]">
                {formatJournalDate(featured.date)} · {featured.minutes} min read ·{" "}
                {featured.author}
              </p>
              <p className="mt-5 text-[14px] font-semibold text-[var(--brand-forest)]">
                Read the piece →
              </p>
            </Link>

            <p className="mt-12 text-[12px] font-medium tracking-[0.08em] text-[var(--brand-forest)]">
              THE SERIES
            </p>
            <h2 className="font-display mt-2 text-[22px] font-semibold tracking-tight">
              Seven more from the house.
            </h2>

            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {rest.map((article, i) => (
                <li key={article.slug}>
                  <Link
                    href={articlePath(article.slug)}
                    className="flex h-full flex-col rounded-xl border border-[var(--brand-hairline)] bg-[var(--brand-paper-warm)] p-6 transition hover:border-[var(--brand-hairline-strong)] hover:bg-[var(--brand-cream)]/50"
                  >
                    <p className="text-[12px] font-semibold text-[var(--brand-forest)]">
                      {String(i + 2).padStart(2, "0")}{" "}
                      <span className="font-medium tracking-[0.08em]">
                        {article.kicker}
                      </span>
                    </p>
                    <h3 className="font-display mt-2 text-[22px] font-semibold leading-snug tracking-tight">
                      {article.title}
                    </h3>
                    <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[var(--brand-ink-muted)]">
                      {article.dek}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-10">
            <p className="text-[12px] font-medium tracking-[0.08em] text-[var(--brand-forest)]">
              FEATURED
            </p>
            <h2 className="font-display mt-2 text-[24px] font-semibold tracking-tight md:text-[28px]">
              {featured.title}
            </h2>
            <p className="mt-2 max-w-[52ch] text-[16px] leading-relaxed text-[var(--brand-ink-muted)]">
              {featured.dek}
            </p>
            <div className="mt-8">
              <ResourceGate
                resourceSlug="journal"
                kicker="OPEN THE JOURNAL"
                heading="Leave your email to see every piece."
                submitLabel="Open the journal"
              />
            </div>
          </div>
        )}

        <CohortNudge />
      </div>
    </JournalShell>
  );
}
