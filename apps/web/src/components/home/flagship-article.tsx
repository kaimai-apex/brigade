import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { articlePath, featuredArticle } from "@/lib/journal/articles";
import { ROADMAP_PATH } from "@/lib/learn";

/** The one public guide, sitting on the homepage so a visitor can read it now. */
export function FlagshipArticle() {
  const article = featuredArticle();

  return (
    <section className="bg-[var(--brand-paper-warm)] pb-10 pt-2 md:pb-16">
      <div className="mk-shell">
        <div className="mx-auto max-w-[820px] rounded-[28px] bg-[var(--brand-cream)] px-5 py-8 md:px-12 md:py-12">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[var(--brand-forest)]">
            FREE GUIDE
          </p>
          <h2
            className="mt-3 text-balance text-[var(--brand-ink)]"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 470,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
            }}
          >
            {article.title}
          </h2>
          <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-[var(--brand-ink-muted)] md:text-[18px]">
            {article.dek}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href={articlePath(article.slug)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--mk-ink)] px-6 text-[15px] font-semibold text-[var(--brand-white)] transition hover:scale-[1.02]"
            >
              Read the article
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href={ROADMAP_PATH}
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--brand-ink)] transition hover:text-[var(--brand-forest)]"
            >
              See the Private Chef Roadmap
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
