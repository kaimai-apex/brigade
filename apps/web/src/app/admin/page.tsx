'use client';

import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { Card } from '@/components/ui/card';

export default function AdminPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/connectpro/api/v1/analytics/overview', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-display mb-6 text-3xl font-black">Admin portal</h1>
        <Card className="p-6">
          <p className="mb-4 text-sm text-ink/65">
            Platform overview from analytics-service. Requires admin role after backend wiring.
          </p>
          <pre className="overflow-auto rounded-lg bg-ink/5 p-4 text-xs">
            {stats ? JSON.stringify(stats, null, 2) : 'No analytics data — start the stack and sign in.'}
          </pre>
        </Card>
      </main>
    </div>
  );
}
