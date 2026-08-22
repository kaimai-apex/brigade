import Link from 'next/link';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { JournalHeader } from '@/components/journal/journal-header';
import { getAllArticleMeta } from '@/lib/journal';
import { BrandLink } from '@/components/brand/brand-mark';

export const dynamic = 'force-static';

/**
 * Journal index — "Notes from the line." Vertical stack of article headers.
 * Matches Figma design (6:4) with warm Brigade palette (paper-warm background).
 */
export default function JournalIndexPage() {
  const articles = getAllArticleMeta();

  return (
    <div className="min-h-screen bg-paper-warm">
      <MarketingHeader />

      {/* Lede section */}
      <div className="mx-auto flex max-w-[680px] flex-col gap-4 px-5 pb-8 pt-20 md:pt-24">
        <p
          className="font-body text-[12px] font-medium uppercase tracking-[0.02em] text-forest"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          JOURNAL
        </p>
        <h1
          className="font-display text-[52px] font-bold leading-[60px] tracking-[-0.015em] text-ink"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          Notes from the line.
        </h1>
        <p
          className="font-body text-[18px] leading-[28px] text-ink-muted"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          Kitchen-honest notes on costing, first clients, and the move from restaurant to private. A plan,
          not just advice.
        </p>
      </div>

      {/* Article list */}
      <div className="mx-auto max-w-[680px] px-5 pb-20">
        {articles.map((article) => (
          <JournalHeader key={article.slug} article={article} variant="index" />
        ))}
      </div>

      {/* Footer hairline */}
      <div className="h-px w-full bg-hairline" />

      {/* Footer */}
      <footer className="bg-paper-warm px-16 py-12">
        <div className="mx-auto flex max-w-[1200px] items-center">
          <BrandLink priority markSize={40} />
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/mentors"
              className="rounded-lg p-3 text-[14px] font-medium text-ink/70 transition hover:bg-black/5 hover:text-ink"
            >
              Find a mentor
            </Link>
            <Link
              href="/journal"
              className="rounded-lg p-3 text-[14px] font-medium text-ink/70 transition hover:bg-black/5 hover:text-ink"
            >
              Journal
            </Link>
            <Link
              href="/login?next=/mentorship/setup"
              className="rounded-lg p-3 text-[14px] font-medium text-ink/70 transition hover:bg-black/5 hover:text-ink"
            >
              Become a mentor
            </Link>
            <Link
              href="/login"
              className="rounded-lg p-3 text-[14px] font-medium text-ink/70 transition hover:bg-black/5 hover:text-ink"
            >
              Log in
            </Link>
            <Link
              href="/book"
              className="rounded-lg p-3 text-[14px] font-medium text-ink/70 transition hover:bg-black/5 hover:text-ink"
            >
              Book a call
            </Link>
          </div>
        </div>
        <p
          className="mx-auto mt-6 max-w-[1200px] font-body text-[12px] tracking-[0.02em] text-ink-subtle"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          © 2026 Brigade · joinbrigade.co
        </p>
      </footer>
    </div>
  );
}
