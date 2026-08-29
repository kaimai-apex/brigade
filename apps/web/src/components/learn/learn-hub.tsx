import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ApplyButton } from "@/components/home/apply-button";
import { LEARN_TOPICS } from "@/lib/accelerator";
import { ROADMAP_COPY } from "@/lib/learn";
import {
  articlePath,
  listArticles,
  type JournalArticle,
} from "@/lib/journal/articles";
import { ROADMAP_DOWNLOAD_PATH } from "@/lib/journal/roadmap";
import { LearnFocus } from "@/components/learn/learn-focus";

function IndexRow({ article }: { article: JournalArticle }) {
  const n = String(article.order).padStart(2, "0");
  return (
    <li className="border-b border-[var(--brand-hairline)] last:border-b-0">
      <Link
        href={articlePath(article.slug)}
        className="group grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-5 md:grid-cols-[4.25rem_minmax(0,1fr)_auto] md:gap-x-6 md:py-6"
      >
        <span
          className="text-[22px] font-medium italic leading-none text-[var(--brand-forest)] md:text-[28px]"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          {n}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-[var(--brand-forest)]">
              {article.kicker}
            </span>
            {article.featured ? (
              <span className="rounded-full bg-[var(--brand-forest)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--brand-paper-warm)]">
                START HERE
              </span>
            ) : null}
          </span>
          <span
            className="mt-1.5 block text-[18px] font-medium leading-snug tracking-tight text-[var(--brand-ink)] transition group-hover:text-[var(--brand-forest)] md:text-[24px]"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            {article.title}
          </span>
        </span>
        <span className="hidden items-center gap-2 self-center text-[13px] text-[var(--brand-ink-subtle)] sm:inline-flex">
          {article.minutes} min
          <ArrowRight
            className="size-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
            aria-hidden
          />
        </span>
      </Link>
    </li>
  );
}

/** Logged-in learning hub: every free guide, the roadmap, and a cohort CTA. */
export function LearnHub() {
  const articles = listArticles();

  return (
    <div className="mx-auto max-w-[820px]">
      <LearnFocus />
      <p className="text-[12px] font-semibold tracking-[0.16em] text-[var(--brand-forest)]">
        LEARN
      </p>
      <h1
        className="mt-3 text-balance text-[var(--brand-ink)]"
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: "clamp(2.15rem, 5vw, 3.5rem)",
          fontWeight: 470,
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
        }}
      >
        How private cheffing works.
      </h1>
      <p className="mt-4 max-w-[40ch] text-[16px] leading-relaxed text-[var(--brand-ink-muted)] md:text-[18px]">
        Free guides and Jordan&apos;s roadmap. When you are ready to do the
        work, join the cohort.
      </p>
      <span
        aria-hidden
        className="mt-8 block h-px w-16 bg-[var(--brand-gold)]"
      />

      <ul className="mt-10 flex flex-wrap gap-2">
        {LEARN_TOPICS.map((topic) =>
          topic.href ? (
            <li key={topic.label}>
              <Link
                href={topic.href}
                className="inline-flex rounded-full bg-[var(--brand-cream)] px-3 py-1.5 text-[13px] font-medium text-[var(--brand-ink)] transition hover:bg-[var(--brand-cream)]/80"
              >
                {topic.label}
              </Link>
            </li>
          ) : (
            <li key={topic.label}>
              <span className="inline-flex rounded-full bg-[var(--brand-cream)]/60 px-3 py-1.5 text-[13px] font-medium text-[var(--brand-ink-muted)]">
                {topic.label}
              </span>
            </li>
          ),
        )}
      </ul>

      <ol className="mt-10 rounded-[28px] bg-[var(--brand-cream)] px-5 shadow-[0_1px_0_rgba(26,26,23,0.04)] md:mt-14 md:px-12">
        {articles.map((article) => (
          <IndexRow key={article.slug} article={article} />
        ))}
      </ol>

      <section id="roadmap" className="mt-16 scroll-mt-[108px] md:scroll-mt-[120px]">
        <p className="text-[12px] font-semibold tracking-[0.16em] text-[var(--brand-forest)]">
          {ROADMAP_COPY.kicker}
        </p>
        <h2
          className="mt-3 text-balance text-[var(--brand-ink)]"
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: "clamp(1.85rem, 4vw, 2.75rem)",
            fontWeight: 470,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {ROADMAP_COPY.title}
        </h2>
        <div className="mt-4 max-w-[52ch] space-y-4 text-[16px] leading-relaxed text-[var(--brand-ink-muted)] md:text-[18px]">
          {ROADMAP_COPY.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="mt-8 flex justify-center rounded-2xl bg-[var(--brand-cream)] px-3 py-6 md:px-8 md:py-10">
          <Image
            src={ROADMAP_DOWNLOAD_PATH}
            alt="A seven-step roadmap from restaurant kitchens to paid private clients."
            width={480}
            height={2058}
            className="h-auto w-full max-w-[480px]"
            priority
            unoptimized
          />
        </div>
        <p className="mt-6">
          <a
            href={ROADMAP_DOWNLOAD_PATH}
            download="private-chef-roadmap.svg"
            className="text-[14px] font-semibold text-[var(--brand-forest)] underline-offset-2 hover:underline"
          >
            Download the roadmap ↓
          </a>
        </p>
      </section>

      <div className="mt-14 text-center">
        <p className="text-[16px] text-[var(--brand-ink-muted)]">
          When you know enough, do the work with people who already did it.
        </p>
        <div className="mt-5 flex justify-center">
          <ApplyButton>Join The Next Brigade Cohort</ApplyButton>
        </div>
      </div>
    </div>
  );
}
