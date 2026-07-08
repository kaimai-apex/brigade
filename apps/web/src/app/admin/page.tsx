'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

function humanize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function AdminPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/connectpro/api/v1/analytics/overview', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const numericEntries = stats
    ? Object.entries(stats).filter(
        ([, v]) => typeof v === 'number' || typeof v === 'string',
      )
    : [];

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display mb-2 text-3xl font-black">Admin portal</h1>
        <p className="mb-8 text-ink/65">
          Platform overview from analytics-service.
        </p>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-3 h-8 w-16" />
              </Card>
            ))}
          </div>
        ) : numericEntries.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {numericEntries.map(([key, value]) => (
                <Card key={key} className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                    {humanize(key)}
                  </p>
                  <p className="mt-2 font-display text-3xl font-black text-forest">
                    {typeof value === 'number'
                      ? value.toLocaleString()
                      : String(value)}
                  </p>
                </Card>
              ))}
            </div>
            <Card className="mt-6 p-6">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="size-4 text-ink/50" />
                <h2 className="font-display text-lg font-bold">Raw payload</h2>
              </div>
              <Separator className="mb-3" />
              <pre className="overflow-auto rounded-lg bg-ink/5 p-4 text-xs">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </Card>
          </>
        ) : (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
              <BarChart3 className="size-6" />
            </div>
            <p className="font-display text-xl font-bold">No analytics yet</p>
            <p className="max-w-sm text-sm text-ink/60">
              Start the full stack and sign in with an admin role to see platform
              metrics here.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
