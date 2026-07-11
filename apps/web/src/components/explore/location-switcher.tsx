'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search } from 'lucide-react';
import { LOCATIONS } from '@/lib/explore';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Lets users pick a preset location or search any city. Navigating updates the
 * `?loc=` / `?q=` params, which the server page reads to auto-load that area's
 * restaurants from OpenStreetMap.
 */
export function LocationSwitcher({
  basePath,
  activeSlug,
  activeName,
}: {
  basePath: string;
  activeSlug?: string;
  activeName?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`${basePath}?q=${encodeURIComponent(q)}`);
  }

  const isGeocoded = activeSlug?.startsWith('q:');

  return (
    <div className="mb-6 space-y-3">
      <form onSubmit={submit} className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any city or neighbourhood…"
          className="pl-9"
          aria-label="Search a location"
        />
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink/45">
          <MapPin className="size-3.5" /> Browsing
        </span>
        {LOCATIONS.map((l) => {
          const active = l.slug === activeSlug;
          return (
            <button
              key={l.slug}
              type="button"
              onClick={() => router.push(`${basePath}?loc=${l.slug}`)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                active
                  ? 'border-rust bg-rust text-white'
                  : 'border-neutral-200 bg-white text-ink/70 hover:bg-neutral-50',
              )}
            >
              {l.name}
            </button>
          );
        })}
        {isGeocoded && activeName && (
          <span className="rounded-full border border-rust bg-rust px-2.5 py-1 text-xs font-semibold text-white">
            {activeName}
          </span>
        )}
      </div>
    </div>
  );
}
