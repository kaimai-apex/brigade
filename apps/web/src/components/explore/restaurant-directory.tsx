'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Restaurant } from '@/lib/explore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { RestaurantCard } from './restaurant-card';

/** Common cuisine facets — drive the server-side `cuisine` filter. */
const CUISINES = [
  'Italian',
  'Japanese',
  'Chinese',
  'Thai',
  'French',
  'Mexican',
  'Indian',
  'Korean',
  'Sushi',
  'Seafood',
  'Steakhouse',
  'Mediterranean',
  'Middle Eastern',
  'Vietnamese',
  'Spanish',
  'Pizza',
  'Burger',
  'Vegetarian',
  'Contemporary',
  'Bistro',
];

const PRICES = ['$', '$$', '$$$', '$$$$'];

type Filters = {
  search: string;
  cuisine: string;
  price: string;
  accolade: string;
};

export function RestaurantDirectory({
  restaurants,
  total,
  page,
  limit,
  attribution,
  basePath,
  filters,
  preserve,
}: {
  restaurants: Restaurant[];
  total: number;
  page: number;
  limit: number;
  attribution?: string;
  basePath: string;
  filters: Filters;
  preserve: { loc?: string; q?: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search);
  const firstRender = useRef(true);

  // Build a URL with the given overrides, preserving location + other filters.
  function urlFor(overrides: Partial<Filters & { page: number }>) {
    const merged = { ...filters, ...overrides };
    const p = new URLSearchParams();
    if (preserve.loc) p.set('loc', preserve.loc);
    if (preserve.q) p.set('q', preserve.q);
    if (merged.search) p.set('search', merged.search);
    if (merged.cuisine) p.set('cuisine', merged.cuisine);
    if (merged.price) p.set('price', merged.price);
    if (merged.accolade) p.set('accolade', merged.accolade);
    const pg = overrides.page ?? 1;
    if (pg > 1) p.set('page', String(pg));
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  // Debounce the free-text search into the URL (server re-queries).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (search !== filters.search) navigate(urlFor({ search, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasFilters =
    filters.search || filters.cuisine || filters.price || filters.accolade;

  return (
    <div>
      <Card className="mb-6 space-y-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants and neighbourhoods…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={filters.cuisine}
            onChange={(e) => navigate(urlFor({ cuisine: e.target.value, page: 1 }))}
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm"
            aria-label="Filter by cuisine"
          >
            <option value="">All cuisines</option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.price}
            onChange={(e) => navigate(urlFor({ price: e.target.value, page: 1 }))}
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm"
            aria-label="Filter by price"
          >
            <option value="">Any price</option>
            {PRICES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              navigate(
                urlFor({
                  accolade: filters.accolade === 'Michelin' ? '' : 'Michelin',
                  page: 1,
                }),
              )
            }
            className={cn(
              'h-9 rounded-full border px-3 text-sm font-semibold transition',
              filters.accolade === 'Michelin'
                ? 'border-gold bg-gold/20 text-[#8a6d1f]'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
            )}
          >
            ★ Michelin
          </button>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setSearch('');
                navigate(urlFor({ search: '', cuisine: '', price: '', accolade: '', page: 1 }));
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          {isPending ? 'Loading…' : `${total.toLocaleString()} restaurants`}
          {totalPages > 1 && ` · page ${page} of ${totalPages}`}
        </p>
      </Card>

      {restaurants.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-display text-2xl font-bold">No matches</p>
          <p className="mt-3 text-ink/65">
            Try a different cuisine, price, or search — or clear filters.
          </p>
        </Card>
      ) : (
        <ul
          className={cn(
            'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
            isPending && 'opacity-60 transition',
          )}
        >
          {restaurants.map((r) => (
            <li key={r.id}>
              <RestaurantCard restaurant={r} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => navigate(urlFor({ page: page - 1 }))}
          >
            Previous
          </Button>
          <span className="text-sm text-ink/60">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => navigate(urlFor({ page: page + 1 }))}
          >
            Next
          </Button>
        </div>
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
