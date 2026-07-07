'use client';

import { useEffect, useState } from 'react';
import { api, type SearchResult } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      api.autocomplete(query).then((res) => setSuggestions(res.suggestions ?? [])).catch(() => null);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.search(query);
      setResults(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display mb-6 text-3xl font-black">Search</h1>
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="Search people, jobs, posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
          <Button onClick={runSearch} disabled={loading}>
            Search
          </Button>
        </div>

        {suggestions.length > 0 && (
          <Card className="mb-4 p-3">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="block w-full px-2 py-1 text-left text-sm hover:bg-cream"
                onClick={() => {
                  setQuery(s);
                  void runSearch();
                }}
              >
                {s}
              </button>
            ))}
          </Card>
        )}

        <div className="space-y-3">
          {results.map((r) => (
            <Card key={`${r.type}-${r.id}`} className="p-4">
              <p className="text-xs uppercase opacity-50">{r.type}</p>
              <p className="font-semibold">{r.name ?? r.title ?? r.headline}</p>
            </Card>
          ))}
          {results.length === 0 && query && !loading && (
            <p className="text-center opacity-60">No results found.</p>
          )}
        </div>
      </main>
    </div>
  );
}
