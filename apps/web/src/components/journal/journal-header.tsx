import Link from 'next/link';
import type { ArticleMeta } from '@/lib/journal';
import { formatArticleDate } from '@/lib/journal';

type JournalHeaderProps = {
  article: ArticleMeta;
  variant?: 'home' | 'index' | 'compact';
};

/**
 * Article header for Home journal strip, /journal index, and related posts.
 * Adapts from Figma design (5:29) with variants: Home (large), Index (listing), Compact (related).
 */
export function JournalHeader({ article, variant = 'index' }: JournalHeaderProps) {
  const href = `/journal/${article.slug}`;
  const meta = `${formatArticleDate(article.date)}  ·  ${article.readingTime} min read  ·  ${article.author}`;

  // Typography sizes per variant
  const titleSize =
    variant === 'home'
      ? 'text-[32px] leading-[40px] md:text-[36px] md:leading-[44px]'
      : variant === 'index'
        ? 'text-[36px] leading-[44px]'
        : 'text-[24px] leading-[32px]';

  const dekSize = variant === 'compact' ? 'text-[14px] leading-[22px]' : 'text-[16px] leading-[26px]';
  const containerWidth = variant === 'home' ? 'w-full max-w-[720px]' : 'w-full';
  const paddingTop = variant === 'compact' ? 'pt-5' : variant === 'home' ? 'pt-7' : 'pt-8';

  return (
    <article className={`flex flex-col gap-2 ${containerWidth} ${paddingTop}`}>
      <Link href={href} className="group flex flex-col gap-2">
        <p
          className="font-body text-[12px] font-medium uppercase tracking-[0.02em] text-forest"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          {article.kicker}
        </p>
        <h2
          className={`font-display ${titleSize} font-semibold tracking-[-0.015em] text-ink transition-colors group-hover:text-forest`}
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          {article.title}
        </h2>
        <p
          className={`${dekSize} font-body text-ink-muted`}
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          {article.dek}
        </p>
        <p
          className="font-body text-[14px] leading-[22px] text-ink-subtle"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          {meta}
        </p>
      </Link>
      <div className="flex flex-col pt-6">
        <div className="h-px w-full bg-hairline" />
      </div>
    </article>
  );
}
