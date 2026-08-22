import Link from 'next/link';
import { JournalHeader } from '@/components/journal/journal-header';
import { getAllArticleMeta } from '@/lib/journal';

/**
 * Home journal strip — "From the journal" with 3 newest articles.
 * Adapts Figma design (9:207) to Next.js + Brigade tokens.
 */
export function JournalStrip() {
  const articles = getAllArticleMeta().slice(0, 3);

  if (articles.length === 0) return null;

  return (
    <section className="bg-paper-warm px-16 py-20">
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <p
              className="font-body text-[12px] font-medium uppercase tracking-[0.02em] text-forest"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              FROM THE JOURNAL
            </p>
            <h2
              className="font-display text-[32px] font-semibold leading-[40px] tracking-[-0.015em] text-ink"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Notes from the line
            </h2>
          </div>
          <Link
            href="/journal"
            className="rounded-lg py-3 font-body text-[14px] font-medium text-ink transition hover:text-forest"
          >
            See all notes →
          </Link>
        </div>

        {/* Article headers */}
        <div className="mx-auto max-w-[720px]">
          {articles.map((article) => (
            <JournalHeader key={article.slug} article={article} variant="home" />
          ))}
        </div>
      </div>
    </section>
  );
}
