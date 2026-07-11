'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, MessageSquare } from 'lucide-react';
import type { NewsItem, NewsTag } from '@/lib/explore';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TAGS: NewsTag[] = [
  'Toronto',
  'Ontario',
  'Canada',
  'Industry',
  'Openings',
  'Labour',
  'Tech',
];

function timeAgo(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
}

export function NewsFeed({ items }: { items: NewsItem[] }) {
  const [tag, setTag] = useState<NewsTag | ''>('');

  const filtered = useMemo(
    () => (tag ? items.filter((i) => i.tags.includes(tag)) : items),
    [items, tag],
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTag('')}
          className={cn(
            'h-8 rounded-full border px-3 text-sm font-semibold transition',
            tag === ''
              ? 'border-ink bg-ink text-white'
              : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
          )}
        >
          All
        </button>
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag((cur) => (cur === t ? '' : t))}
            className={cn(
              'h-8 rounded-full border px-3 text-sm font-semibold transition',
              tag === t
                ? 'border-forest bg-forest text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="space-y-4">
        {filtered.map((item) => (
          <li key={item.id}>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs text-ink/55">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-forest hover:underline"
                >
                  {item.source}
                </a>
                <span aria-hidden>·</span>
                <span>{timeAgo(item.publishedAt)}</span>
              </div>

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-1 block"
              >
                <h2 className="font-display text-lg font-bold leading-snug group-hover:text-forest">
                  {item.title}
                  <ExternalLink className="ml-1.5 inline size-3.5 text-ink/40" />
                </h2>
              </a>

              <p className="mt-2 text-sm leading-relaxed text-ink/75">
                {item.snippet}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {item.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
                <Link
                  href="/feed"
                  className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-rust hover:underline"
                >
                  <MessageSquare className="size-3.5" />
                  Discuss
                </Link>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-ink/50">
        Aggregated headlines link out to their source. Brigade never republishes
        full articles — always read the original.
      </p>
    </div>
  );
}
