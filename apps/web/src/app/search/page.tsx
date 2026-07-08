'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  FileText,
  Search as SearchIcon,
  User,
  type LucideIcon,
} from 'lucide-react';
import { api, type SearchResult } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

function iconFor(type: string): LucideIcon {
  if (type === 'user') return User;
  if (type === 'job') return Briefcase;
  if (type === 'company') return Building2;
  return FileText;
}

function hrefFor(r: SearchResult): string | null {
  if (r.type === 'user') return `/profile/${r.id}`;
  if (r.type === 'job') return `/jobs/${r.id}`;
  if (r.type === 'company') return `/companies/${r.id}`;
  return null;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .autocomplete(query)
        .then((res) => setSuggestions(res.suggestions ?? []))
        .catch(() => null);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function runSearch(q = query) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setSuggestions([]);
    try {
      const res = await api.search(q);
      setResults(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display mb-6 text-3xl font-black">Search</h1>

        <div className="relative mb-4 flex gap-2">
          <Input
            placeholder="Search people, jobs, companies…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
          <Button onClick={() => runSearch()} disabled={loading}>
            <SearchIcon className="size-4" />
            Search
          </Button>

          {suggestions.length > 0 && (
            <Card className="absolute left-0 right-0 top-12 z-10 max-h-64 overflow-auto p-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink/5"
                  onClick={() => {
                    setQuery(s);
                    void runSearch(s);
                  }}
                >
                  <SearchIcon className="size-3.5 text-ink/40" />
                  {s}
                </button>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-3">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </Card>
            ))}

          {!loading &&
            results.map((r) => {
              const Icon = iconFor(r.type);
              const label = r.name ?? r.title ?? r.headline ?? 'Result';
              const href = hrefFor(r);
              const inner = (
                <Card className="flex items-center gap-3 p-4 transition hover:bg-ink/[0.03]">
                  <Avatar size="lg">
                    <AvatarFallback className="bg-secondary text-forest">
                      <Icon className="size-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{label}</p>
                    {r.headline && r.headline !== label && (
                      <p className="truncate text-sm text-ink/60">{r.headline}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {r.type}
                  </Badge>
                </Card>
              );
              return href ? (
                <Link key={`${r.type}-${r.id}`} href={href} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={`${r.type}-${r.id}`}>{inner}</div>
              );
            })}

          {!loading && searched && results.length === 0 && (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
                <SearchIcon className="size-6" />
              </div>
              <p className="font-display text-xl font-bold">No results found</p>
              <p className="text-sm text-ink/60">Try different keywords.</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
