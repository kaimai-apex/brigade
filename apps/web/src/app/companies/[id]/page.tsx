'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, type Company } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api.getCompany(params.id).then(setCompany).catch(() => setCompany(null));
  }, [params.id]);

  async function follow() {
    if (!company) return;
    try {
      await api.followCompany(company.id);
      setFollowing(true);
      setCompany((c) =>
        c ? { ...c, followerCount: (c.followerCount ?? 0) + 1 } : c,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to follow');
    }
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-paper">
        <SiteHeader showAuth={false} />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center opacity-60">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Card className="p-6">
          <h1 className="font-display text-3xl font-black">{company.name}</h1>
          {company.description && <p className="mt-4 text-ink/70">{company.description}</p>}
          <p className="mt-4 text-sm opacity-60">{company.followerCount ?? 0} followers</p>
          <Button className="mt-6" variant={following ? 'outline' : 'default'} onClick={follow} disabled={following}>
            {following ? 'Following' : 'Follow company'}
          </Button>
        </Card>
      </main>
    </div>
  );
}
