'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Restaurant } from '@/lib/explore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { RestaurantCard } from './restaurant-card';

export function RestaurantDirectory({
  restaurants,
  attribution,
}: {
  restaurants: Restaurant[];
  attribution?: string;
}) {
  const [query, setQuery] = useState('');
  const [neighbourhood, setNeighbourhood] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [prestigeOnly, setPrestigeOnly] = useState(false);

  const neighbourhoods = useMemo(
    () =>
      [
        ...new Set(
          restaurants
            .map((r) => r.neighbourhood)
            .filter((n): n is string => Boolean(n)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [restaurants],
  );
  const cuisines = useMemo(
    () =>
      [...new Set(restaurants.flatMap((r) => r.cuisineTags))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [restaurants],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (neighbourhood && r.neighbourhood !== neighbourhood) return false;
      if (cuisine && !r.cuisineTags.includes(cuisine)) return false;
      if (
        prestigeOnly &&
        !r.accolades.some(
          (a) => a.source === 'Michelin' || a.source === "Canada's 100 Best",
        )
      )
        return false;
      if (!q) return true;
      const hay = [
        r.name,
        r.neighbourhood,
        r.blurb,
        ...r.cuisineTags,
        ...r.accolades.map((a) => `${a.source} ${a.detail}`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [restaurants, query, neighbourhood, cuisine, prestigeOnly]);

  const hasFilters = query || neighbourhood || cuisine || prestigeOnly;

  return (
    <div>
      <Card className="mb-6 space-y-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurants, cuisines, neighbourhoods…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={neighbourhood}
            onChange={(e) => setNeighbourhood(e.target.value)}
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm"
            aria-label="Filter by neighbourhood"
          >
            <option value="">All neighbourhoods</option>
            {neighbourhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm"
            aria-label="Filter by cuisine"
          >
            <option value="">All cuisines</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setPrestigeOnly((v) => !v)}
            className={cn(
              'h-9 rounded-full border px-3 text-sm font-semibold transition',
              prestigeOnly
                ? 'border-gold bg-gold/20 text-[#8a6d1f]'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
            )}
          >
            ★ Michelin / 100 Best
          </button>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setQuery('');
                setNeighbourhood('');
                setCuisine('');
                setPrestigeOnly(false);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          {filtered.length} of {restaurants.length} restaurants
        </p>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-display text-2xl font-bold">No matches</p>
          <p className="mt-3 text-ink/65">
            Try a different neighbourhood or cuisine — or clear filters.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <RestaurantCard restaurant={r} />
            </li>
          ))}
        </ul>
      )}

      {attribution && (
        <p className="mt-8 text-xs text-ink/45">
          Live restaurant data {attribution}. Accolades curated from Michelin,
          Canada’s 100 Best and local press.
        </p>
      )}
    </div>
  );
}
