'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import type { JobListing, JobType } from '@/lib/explore';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TYPES: { value: JobType; label: string }[] = [
  { value: 'BOH', label: 'Back of House' },
  { value: 'FOH', label: 'Front of House' },
  { value: 'Management', label: 'Management' },
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Events', label: 'Events' },
];

const TYPE_STYLES: Record<JobType, string> = {
  BOH: 'bg-rust/10 text-rust',
  FOH: 'bg-forest/10 text-forest',
  Management: 'bg-cobalt/10 text-cobalt',
  Hotel: 'bg-gold/15 text-[#8a6d1f]',
  Events: 'bg-secondary text-secondary-foreground',
};

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - +new Date(iso)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export function JobsBoard({ jobs }: { jobs: JobListing[] }) {
  const [type, setType] = useState<JobType | ''>('');

  const filtered = useMemo(
    () => (type ? jobs.filter((j) => j.type === type) : jobs),
    [jobs, type],
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setType('')}
          className={cn(
            'h-8 rounded-full border px-3 text-sm font-semibold transition',
            type === ''
              ? 'border-ink bg-ink text-white'
              : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
          )}
        >
          All roles
        </button>
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType((cur) => (cur === t.value ? '' : t.value))}
            className={cn(
              'h-8 rounded-full border px-3 text-sm font-semibold transition',
              type === t.value
                ? 'border-ink bg-ink text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {filtered.map((job) => (
          <li key={job.id}>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <Card className="flex items-start gap-4 p-5 transition group-hover:border-neutral-300 group-hover:shadow-md">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold group-hover:text-forest">
                      {job.title}
                    </h2>
                    <Badge className={TYPE_STYLES[job.type]}>{job.type}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-ink/70">{job.employer}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/60">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {job.neighbourhood}
                    </span>
                    <span>{job.employment}</span>
                    {job.compensation && (
                      <span className="font-semibold text-ink/75">
                        {job.compensation}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-ink/50">{timeAgo(job.postedAt)}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-forest">
                    {job.source}
                    <ExternalLink className="size-3" />
                  </p>
                </div>
              </Card>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-ink/50">
        Listings are curated link-outs to their source board, refreshed weekly.
        Native postings for Brigade venues are coming soon.
      </p>
    </div>
  );
}
