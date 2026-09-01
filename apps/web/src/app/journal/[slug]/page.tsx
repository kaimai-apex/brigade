import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/journal/article-body";
import { JournalShell } from "@/components/journal/journal-shell";
import { CohortNudge } from "@/components/home/cohort-nudge";
import { ResourceSignupCta } from "@/components/journal/resource-signup-cta";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  FLAGSHIP_ARTICLE_PATH,
  LEARN_PATH,
  isFlagshipArticleSlug,
} from "@/lib/learn";
import {
  articlePath,
  formatJournalDate,
  getArticle,
  JOURNAL_AUTHOR_HREF,
  listArticles,
  relatedArticles,
} from "@/lib/journal/articles";

type Params = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Journal · Brigade" };
  const publicPiece = isFlagshipArticleSlug(slug);
  return {
    title: `${article.title} · Brigade Journal`,
    description: article.dek,
    robots: publicPiece
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function JournalPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const session = await getConnectProSession();
  const signedIn = Boolean(session);
  const related = relatedArticles(article);
  const moreGuides = listArticles().filter((item) => item.slug !== article.slug);
  const showSignupWall = isFlagshipArticleSlug(slug) && !signedIn;

  return (
    <JournalShell signedIn={signedIn}>
      <article className="mx-auto max-w-[680px]">
        <p className="text-[12px] font-medium tracking-[0.08em] text-[var(--brand-forest)]">
          {article.kicker}
        </p>
        <h1 className="font-display mt-3 text-[32px] font-semibold leading-[1.15] tracking-tight md:text-[36px]">
          {article.title}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[var(--brand-ink-muted)]">
          {article.dek}
        </p>
        <div className="mt-6 flex items-center gap-3 border-b border-[var(--brand-hairline)] pb-6">
          <Link
            href={signedIn ? JOURNAL_AUTHOR_HREF : FLAGSHIP_ARTICLE_PATH}
            className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--brand-forest)] text-[12px] font-semibold text-[var(--brand-paper-warm)] transition hover:opacity-90"
            aria-label={`${article.author} in the directory`}
          >
            JC
          </Link>
          <p className="text-[14px] text-[var(--brand-ink-subtle)]">
            <Link
              href={signedIn ? JOURNAL_AUTHOR_HREF : FLAGSHIP_ARTICLE_PATH}
              className="font-medium text-[var(--brand-ink)] underline decoration-[var(--brand-ink)]/20 underline-offset-4 transition hover:text-[var(--brand-forest)] hover:decoration-[var(--brand-forest)]"
            >
              {article.author}
            </Link>
            {" · "}
            {formatJournalDate(article.date)} · {article.minutes} min read
          </p>
        </div>

        <div className="mt-8">
          <ArticleBody article={article} />
        </div>

        {showSignupWall ? (
          <section className="mt-12">
            <ResourceSignupCta
              heading="Create a free account to read the rest of the guides."
              body="This piece is free. The other notes, plus Jordan's full Private Chef Roadmap, open when you join."
              next={LEARN_PATH}
              submitLabel="Join the community"
            />
            {moreGuides.length > 0 ? (
              <ul className="mt-8 divide-y divide-[var(--brand-hairline)] border-t border-[var(--brand-hairline)]">
                {moreGuides.map((item) => (
                  <li key={item.slug} className="py-5">
                    <p className="text-[12px] font-medium tracking-[0.08em] text-[var(--brand-forest)]">
                      {item.kicker}
                    </p>
                    <h2 className="font-display mt-1 text-[22px] font-semibold tracking-tight text-[var(--brand-ink)]">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-[15px] text-[var(--brand-ink-muted)]">
                      {item.dek}
                    </p>
                    <p className="mt-2 text-[13px] font-medium text-[var(--brand-ink-subtle)]">
                      Sign up to read
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : related.length > 0 ? (
          <section className="mt-12">
            <p className="text-[12px] font-medium tracking-[0.08em] text-[var(--brand-forest)]">
              MORE FROM JORDAN
            </p>
            <ul className="mt-4 divide-y divide-[var(--brand-hairline)] border-t border-[var(--brand-hairline)]">
              {related.map((item) => (
                <li key={item.slug} className="py-5">
                  <Link href={articlePath(item.slug)} className="block">
                    <p className="text-[12px] font-medium tracking-[0.08em] text-[var(--brand-forest)]">
                      {item.kicker}
                    </p>
                    <h2 className="font-display mt-1 text-[22px] font-semibold tracking-tight">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-[15px] text-[var(--brand-ink-muted)]">
                      {item.dek}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              <Link
                href="/learn"
                className="text-[14px] font-semibold text-[var(--brand-forest)]"
              >
                ← All journal pieces
              </Link>
            </p>
          </section>
        ) : null}

        <CohortNudge />
      </article>
    </JournalShell>
  );
}
