'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { Profile } from '@/lib/types/database';
import {
  DIRECTORY_PAGE_SIZE,
  SORT_OPTIONS,
  countActiveFilters,
  directoryQueryString,
  mapDirectoryRow,
  type DirectoryFacets,
  type DirectoryParams,
  type DirectorySort,
} from '@/lib/directory/params';
import { cn, pluralize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DirectoryFilters } from '@/components/directory/directory-filters';
import { DirectoryCard, DirectoryRow } from '@/components/directory/directory-card';
import { DirectoryQuickLook } from '@/components/directory/directory-quick-look';

const VIEW_KEY = 'brigade:directory-view';

type Props = {
  initialProfiles: Profile[];
  total: number;
  facets: DirectoryFacets;
  params: DirectoryParams;
  savedIds: string[];
};

export function DirectoryView({
  initialProfiles,
  total,
  facets,
  params,
  savedIds,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const paramsKey = directoryQueryString(params);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  // ---- results + infinite scroll -------------------------------------------
  const [items, setItems] = useState<Profile[]>(initialProfiles);
  const [offset, setOffset] = useState(initialProfiles.length);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // New server payload (a filter/sort/search navigation) → reset the list.
    setItems(initialProfiles);
    setOffset(initialProfiles.length);
  }, [paramsKey, initialProfiles]);

  const hasMore = items.length < total;

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const qs = directoryQueryString({
        ...params,
        limit: DIRECTORY_PAGE_SIZE,
        offset,
      });
      const res = await fetch(`/api/users/directory?${qs}`);
      const json = await res.json();
      const next: Profile[] = (json.data ?? []).map(mapDirectoryRow);
      setItems((prev) => [...prev, ...next]);
      setOffset((prev) => prev + next.length);
    } catch {
      /* silent — user can scroll again */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, params, offset]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // ---- URL-driven filters ---------------------------------------------------
  const apply = useCallback(
    (next: DirectoryParams) => {
      const qs = directoryQueryString(next);
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // ---- search (debounced) ---------------------------------------------------
  const [q, setQ] = useState(params.q ?? '');
  useEffect(() => setQ(params.q ?? ''), [params.q]);
  useEffect(() => {
    const handle = setTimeout(() => {
      if ((q.trim() || undefined) !== params.q) apply({ ...params, q: q.trim() || undefined });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ---- view toggle (persisted) ---------------------------------------------
  const [view, setView] = useState<'grid' | 'list'>('grid');
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_KEY);
    if (stored === 'grid' || stored === 'list') setView(stored);
  }, []);
  const setViewPersist = (v: 'grid' | 'list') => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  // ---- quick look -----------------------------------------------------------
  const [quickLook, setQuickLook] = useState<Profile | null>(null);

  const activeCount = countActiveFilters(params);
  const topRoles = facets.roles.slice(0, 8);

  // Removable active-filter chips.
  const chips: { label: string; onClear: () => void }[] = [];
  if (params.role) chips.push({ label: params.role, onClear: () => apply({ ...params, role: undefined }) });
  if (params.city) chips.push({ label: params.city, onClear: () => apply({ ...params, city: undefined, state: undefined }) });
  for (const e of params.expertise ?? [])
    chips.push({ label: e, onClear: () => apply({ ...params, expertise: (params.expertise ?? []).filter((x) => x !== e) }) });
  if (params.openToWork) chips.push({ label: 'Open to work', onClear: () => apply({ ...params, openToWork: undefined }) });
  if (params.privateEvents) chips.push({ label: 'Private events', onClear: () => apply({ ...params, privateEvents: undefined }) });
  if (params.contract) chips.push({ label: 'Contract ready', onClear: () => apply({ ...params, contract: undefined }) });
  if (params.emergency) chips.push({ label: 'Emergency', onClear: () => apply({ ...params, emergency: undefined }) });
  if (typeof params.minYears === 'number') chips.push({ label: `${params.minYears}+ yrs`, onClear: () => apply({ ...params, minYears: undefined }) });
  if (params.hasPhoto) chips.push({ label: 'Has photo', onClear: () => apply({ ...params, hasPhoto: undefined }) });

  const clearAll = () => apply({ q: params.q, sort: params.sort });
  const activeSort = SORT_OPTIONS.find((o) => o.value === (params.sort ?? 'recent'));

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
      {/* Desktop filter rail */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">Filters</h2>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-forest hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <DirectoryFilters params={params} facets={facets} onChange={apply} />
        </div>
      </aside>

      <div className="min-w-0">
        {/* Toolbar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, role, city, or specialty"
              className="h-12 pl-9"
            />
          </div>

          {/* Category chips (quick role browse) */}
          {topRoles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {topRoles.map((r) => {
                const active = params.role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => apply({ ...params, role: active ? undefined : r.value })}
                    className={cn(
                      'h-8 shrink-0 rounded-full border px-3 text-sm font-semibold whitespace-nowrap',
                      active
                        ? 'border-forest bg-forest text-white'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-forest/40',
                    )}
                  >
                    {r.value}
                  </button>
                );
              })}
            </div>
          )}

          {/* Controls row: mobile filters + count + sort + view toggle */}
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="size-4" />
                  Filters
                  {activeCount > 0 && (
                    <Badge className="ml-1 bg-forest text-paper">{activeCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto p-4">
                <SheetHeader className="px-0">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="mb-2 text-xs font-semibold text-forest hover:underline"
                  >
                    Clear all
                  </button>
                )}
                <DirectoryFilters params={params} facets={facets} onChange={apply} />
              </SheetContent>
            </Sheet>

            <p className="text-meta text-ink/60">{pluralize(total, 'member')}</p>

            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {activeSort?.label ?? 'Sort'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SORT_OPTIONS.map((o) => (
                    <DropdownMenuItem
                      key={o.value}
                      onClick={() =>
                        apply({ ...params, sort: o.value === 'recent' ? undefined : (o.value as DirectorySort) })
                      }
                    >
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex overflow-hidden rounded-lg border border-neutral-200">
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  onClick={() => setViewPersist('grid')}
                  className={cn('grid size-9 place-items-center', view === 'grid' ? 'bg-forest text-white' : 'bg-white text-neutral-600')}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  onClick={() => setViewPersist('list')}
                  className={cn('grid size-9 place-items-center border-l border-neutral-200', view === 'list' ? 'bg-forest text-white' : 'bg-white text-neutral-600')}
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((c, i) => (
                <button
                  key={`${c.label}-${i}`}
                  type="button"
                  onClick={c.onClear}
                  className="inline-flex items-center gap-1 rounded-full bg-forest/10 py-1 pl-3 pr-2 text-xs font-semibold text-forest hover:bg-forest/20"
                >
                  {c.label}
                  <X className="size-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-10 text-center">
            <p className="text-section-title">No matches</p>
            <p className="mt-2 text-body-md text-ink/65">
              Try a different location, role, or specialty — or clear your filters.
            </p>
            {(activeCount > 0 || params.q) && (
              <Button variant="outline" className="mt-4" onClick={() => apply({})}>
                Clear filters
              </Button>
            )}
          </div>
        ) : view === 'grid' ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <DirectoryCard
                key={p.id}
                profile={p}
                saved={savedSet.has(p.id)}
                onQuickLook={setQuickLook}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {items.map((p) => (
              <DirectoryRow
                key={p.id}
                profile={p}
                saved={savedSet.has(p.id)}
                onQuickLook={setQuickLook}
              />
            ))}
          </div>
        )}

        {/* Infinite-scroll sentinel + fallback */}
        {hasMore && (
          <div ref={sentinelRef} className="mt-6 flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </div>

      <DirectoryQuickLook
        profile={quickLook}
        saved={quickLook ? savedSet.has(quickLook.id) : false}
        open={quickLook !== null}
        onOpenChange={(open) => !open && setQuickLook(null)}
      />
    </div>
  );
}
