'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Company } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCompanies()
      .then((res) => setCompanies(res.data ?? []))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-display mb-6 text-3xl font-black">Companies</h1>
        <div className="space-y-4">
          {companies.map((c) => (
            <Card key={c.id} className="p-4">
              <Link href={`/companies/${c.id}`} className="font-semibold hover:underline">
                {c.name}
              </Link>
              {c.description && <p className="mt-2 text-sm opacity-70">{c.description}</p>}
              <p className="mt-2 text-xs opacity-50">{c.followerCount ?? 0} followers</p>
            </Card>
          ))}
          {companies.length === 0 && !loading && (
            <p className="text-center opacity-60">No company pages yet.</p>
          )}
        </div>
        <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </main>
    </div>
  );
}
