import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { JournalHeader } from '@/components/journal/journal-header';
import {
  getAllArticleMeta,
  getArticleBySlug,
  formatArticleDate,
  getAuthorInitials,
} from '@/lib/journal';
import { BrandLink } from '@/components/brand/brand-mark';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  const articles = getAllArticleMeta();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Individual article page matching Figma design (6:5).
 * ~680px measure, hairlines, pull-quote style, bottom CTA, related articles.
 */
export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Get 2 related articles (next newest)
  const allArticles = getAllArticleMeta();
  const currentIndex = allArticles.findIndex((a) => a.slug === slug);
  const related = allArticles
    .slice(currentIndex + 1, currentIndex + 3)
    .concat(allArticles.slice(0, Math.max(0, 2 - (allArticles.length - currentIndex - 1))));

  const initials = getAuthorInitials(article.author);
  const meta = `${article.author}  ·  ${formatArticleDate(article.date)}  ·  ${article.readingTime} min read`;

  return (
    <div className="min-h-screen bg-paper-warm">
      <MarketingHeader />

      {/* Article masthead */}
      <div className="mx-auto flex max-w-[680px] flex-col gap-4 px-5 pt-18">
        <p
          className="font-body text-[12px] font-medium uppercase tracking-[0.02em] text-forest"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          {article.kicker}
        </p>
        <h1
          className="font-display text-[52px] font-bold leading-[60px] tracking-[-0.015em] text-ink"
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          {article.title}
        </h1>
        <p
          className="font-body text-[18px] leading-[28px] text-ink-muted"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          {article.dek}
        </p>

        {/* Byline with initials well */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-forest">
            <p
              className="font-display text-[14px] font-semibold leading-[16px] text-cream"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {initials}
            </p>
          </div>
          <p
            className="font-body text-[14px] leading-[22px] text-ink-muted"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {meta}
          </p>
        </div>
        <div className="h-px w-full bg-hairline" />
      </div>

      {/* Article body */}
      <div className="mx-auto max-w-[680px] px-5 pb-2 pt-6">
        <div
          className="journal-prose"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />
      </div>

      {/* CTA panel */}
      <div className="mx-auto max-w-[680px] px-5">
        <div className="flex flex-col gap-4 rounded-lg bg-sage-pale p-8">
          <p
            className="font-body text-[12px] font-medium uppercase tracking-[0.02em] text-forest"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            IF YOU WANT HELP WITH THIS
          </p>
          <h2
            className="font-display text-[24px] font-semibold leading-[32px] tracking-[-0.015em] text-ink"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            A plan, not just advice.
          </h2>
          <p
            className="font-body text-[16px] leading-[26px] text-ink-muted"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            Sit with a private chef who has already costed a household dinner. Leave knowing what to charge next
            time.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/mentors"
              className="inline-flex items-center rounded-lg bg-ink px-6 py-3.5 font-body text-[16px] font-semibold text-cream transition hover:bg-ink/90"
            >
              Browse mentors
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center rounded-lg bg-gold px-6 py-3.5 font-body text-[16px] font-semibold text-ink transition hover:bg-gold/90"
            >
              Book a 30-minute call for CA$20
            </Link>
          </div>
        </div>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <div className="mx-auto max-w-[680px] px-5 pb-20 pt-12">
          <p
            className="font-body text-[12px] font-medium uppercase tracking-[0.02em] text-forest"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            MORE FROM THE JOURNAL
          </p>
          {related.map((rel) => (
            <JournalHeader key={rel.slug} article={rel} variant="compact" />
          ))}
        </div>
      )}

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
