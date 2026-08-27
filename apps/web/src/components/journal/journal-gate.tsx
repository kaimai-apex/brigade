"use client";

import { ArticleBody } from "@/components/journal/article-body";
import { ResourceGate } from "@/components/journal/resource-gate";
import type { JournalArticle } from "@/lib/journal/articles";

export function JournalGate({
  article,
  preview,
}: {
  article: JournalArticle;
  preview: JournalArticle;
}) {
  return (
    <ResourceGate
      resourceSlug={article.slug}
      submitLabel="Read the piece"
    >
      <div className="relative">
        <div className="max-h-[240px] overflow-hidden">
          <ArticleBody article={preview} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--brand-paper-warm)] to-transparent"
        />
      </div>
    </ResourceGate>
  );
}
