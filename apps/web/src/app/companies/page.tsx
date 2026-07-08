'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Users } from 'lucide-react';
import { api, type Company } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display mb-6 text-3xl font-black">Companies</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex items-start gap-4 p-5">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </Card>
            ))}

          {!loading &&
            companies.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`} className="group block">
                <Card className="flex h-full items-start gap-4 p-5 transition group-hover:-translate-y-1 group-hover:shadow-md">
                  <Avatar className="size-12 border border-ink/10">
                    <AvatarFallback className="bg-secondary text-forest">
                      <Building2 className="size-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold leading-tight group-hover:text-forest">
                      {c.name}
                    </p>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink/70">
                        {c.description}
                      </p>
                    )}
                    <Badge variant="secondary" className="mt-2">
                      <Users className="size-3" />
                      {c.followerCount ?? 0} followers
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
        </div>

        {!loading && companies.length === 0 && (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
              <Building2 className="size-6" />
            </div>
            <p className="font-display text-xl font-bold">No company pages yet</p>
            <p className="text-sm text-ink/60">
              Company profiles will appear here as they join Brigade.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
