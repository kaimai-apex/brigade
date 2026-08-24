import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/journal/article-body";
import { JournalShell } from "@/components/journal/journal-shell";
import {
  articlePath,
  formatJournalDate,
  getArticle,
  listArticles,
  relatedArticles,
} from "@/lib/journal/articles";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return listArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Journal — Brigade" };
  return {
    title: `${article.title} — Brigade Journal`,
    description: article.dek,
  };
}

export default async function JournalPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const related = relatedArticles(article);

  return (
    <JournalShell>
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
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--brand-forest)] text-[12px] font-semibold text-[var(--brand-paper-warm)]">
            JC
          </span>
          <p className="text-[14px] text-[var(--brand-ink-subtle)]">
            {article.author} · {formatJournalDate(article.date)} ·{" "}
            {article.minutes} min read
          </p>
        </div>

        <div className="mt-8">
          <ArticleBody article={article} />
        </div>

        {related.length > 0 && (
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
                href="/journal"
                className="text-[14px] font-semibold text-[var(--brand-forest)]"
              >
                ← All journal pieces
              </Link>
            </p>
          </section>
        )}
      </article>
    </JournalShell>
  );
}
