'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Recommendation } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getRecommendedPeople()
      .then((res) => setRecommendations(res.data.slice(0, 6)))
      .catch(() => setRecommendations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-display mb-2 text-3xl font-black">Dashboard</h1>
        <p className="mb-8 text-ink/65">Your Brigade home base.</p>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/feed', label: 'Feed', desc: 'See network updates' },
            { href: '/connections', label: 'Network', desc: 'Manage connections' },
            { href: '/jobs', label: 'Jobs', desc: 'Browse opportunities' },
            { href: '/messages', label: 'Messages', desc: 'Chat with peers' },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full p-4 transition hover:-translate-y-0.5">
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-ink/60">{item.desc}</p>
              </Card>
            </Link>
          ))}
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">People you may know</h2>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={loading}>
              Refresh
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendations.map((person) => (
              <Card key={person.userId} className="flex items-center justify-between p-4">
                <div>
                  <Link href={`/profile/${person.userId}`} className="font-semibold hover:underline">
                    {person.name}
                  </Link>
                  {person.headline && <p className="text-sm text-ink/60">{person.headline}</p>}
                  {person.reason && <p className="text-xs text-ink/45">{person.reason}</p>}
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await api.sendConnectionRequest(person.userId);
                      alert('Connection request sent');
                    } catch (e) {
                      alert(e instanceof Error ? e.message : 'Failed');
                    }
                  }}
                >
                  Connect
                </Button>
              </Card>
            ))}
            {!loading && recommendations.length === 0 && (
              <p className="text-sm text-ink/60">Complete your profile to get recommendations.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
