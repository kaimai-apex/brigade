import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ApplyButton } from "@/components/home/apply-button";
import { LEARN_TOPICS } from "@/lib/accelerator";
import {
  articlePath,
  listArticles,
  type JournalArticle,
} from "@/lib/journal/articles";

function IndexRow({
  article,
}: {
  article: JournalArticle;
}) {
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

/** Homepage rail of Jordan's journal — titles stay public; bodies sit behind the email wall. */
export function HomeJournal() {
  const articles = listArticles();

  return (
    <section
      id="free-resources"
      className="relative scroll-mt-[88px] bg-[var(--brand-cream)] pb-16 pt-28 md:scroll-mt-[100px] md:pb-24 md:pt-32"
    >
      <div className="mk-shell">
        <div className="mx-auto max-w-[820px] text-center">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[var(--brand-forest)]">
            LEARN
          </p>
          <h2
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
          </h2>
          <p className="mx-auto mt-4 max-w-[40ch] text-[16px] leading-relaxed text-[var(--brand-ink-muted)] md:text-[18px]">
            Free, self-guided notes from a chef who already runs a house. They
            answer what you need to know. The cohort is for doing it.
          </p>
          <span
            aria-hidden
            className="mx-auto mt-8 block h-px w-16 bg-[var(--brand-gold)]"
          />
        </div>

        <ul className="mx-auto mt-10 flex max-w-[820px] flex-wrap justify-center gap-2">
          {LEARN_TOPICS.map((topic) =>
            topic.href ? (
              <li key={topic.label}>
                <Link
                  href={topic.href}
                  className="inline-flex rounded-full bg-[var(--brand-paper-warm)] px-3 py-1.5 text-[13px] font-medium text-[var(--brand-ink)] transition hover:bg-[var(--brand-paper-warm)]/80"
                >
                  {topic.label}
                </Link>
              </li>
            ) : (
              <li key={topic.label}>
                <span className="inline-flex rounded-full bg-[var(--brand-paper-warm)]/60 px-3 py-1.5 text-[13px] font-medium text-[var(--brand-ink-muted)]">
                  {topic.label}
                </span>
              </li>
            ),
          )}
        </ul>

        <ol className="mx-auto mt-10 max-w-[820px] rounded-[28px] bg-[var(--brand-paper-warm)] px-5 shadow-[0_1px_0_rgba(26,26,23,0.04)] md:mt-14 md:px-12">
          {articles.map((article) => (
            <IndexRow key={article.slug} article={article} />
          ))}
        </ol>

        {/* The roadmap sits beside the journal because it is the same thing:
            something of Jordan's you can read for free, no account needed. */}
        <div className="mx-auto mt-10 flex max-w-[820px] flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8 md:mt-12">
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--brand-ink)] transition hover:text-[var(--brand-forest)]"
          >
            Open the journal
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--brand-ink)] transition hover:text-[var(--brand-forest)]"
          >
            See Jordan&apos;s roadmap
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mx-auto mt-10 max-w-[820px] text-center">
          <p className="text-[16px] text-[var(--brand-ink-muted)]">
            When you know enough, do the work with people who already did it.
          </p>
          <div className="mt-5 flex justify-center">
            <ApplyButton />
          </div>
        </div>
      </div>
    </section>
  );
}
