import type { JournalArticle, JournalBlock } from "@/lib/journal/articles";

function Block({ block }: { block: JournalBlock }) {
  if (block.type === "h2") {
    return (
      <h2 className="font-display pt-4 text-[26px] font-semibold tracking-tight text-[var(--brand-ink)]">
        {block.text}
      </h2>
    );
  }
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-2 pl-5 text-[18px] leading-[1.7] text-[var(--brand-ink)]">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className="text-[18px] leading-[1.7] text-[var(--brand-ink)]">
      {block.text}
    </p>
  );
}

export function ArticleBody({ article }: { article: JournalArticle }) {
  return (
    <div className="space-y-5">
      {article.body.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
