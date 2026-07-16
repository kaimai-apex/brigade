'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import { api, type Company } from '@/lib/api/client';
import { AppPage } from '@/components/layout/app-shell';
import { CreateCompanyDialog } from '@/components/company/create-company-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isTestOrDebugCompany, pluralize } from '@/lib/utils';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCompanies()
      .then((res) =>
        setCompanies(
          (res.data ?? []).filter((c) => !isTestOrDebugCompany(c.name)),
        ),
      )
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppPage showAuth={false} mainClassName="py-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="min-w-0 flex-1 truncate text-page-title">Companies</h1>
        <CreateCompanyDialog
          onCreated={(company) => setCompanies((prev) => [company, ...prev])}
          trigger={
            <Button
              size="icon-sm"
              className="touch-compact size-10 shrink-0"
              aria-label="Create company page"
            >
              <Plus className="size-5" />
            </Button>
          }
        />
      </div>

      <div className="divide-y divide-neutral-100">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex h-[72px] items-center gap-3 py-2">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}

        {!loading &&
          companies.map((c) => {
            const href = c.slug ? `/company/${c.slug}` : `/companies/${c.id}`;
            return (
              <Link
                key={c.id}
                href={href}
                className="flex h-[72px] items-center gap-3 py-2 active:bg-neutral-50"
              >
                <Avatar className="size-11 border border-ink/10">
                  <AvatarFallback className="bg-secondary text-forest">
                    <Building2 className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold">{c.name}</p>
                  <p className="text-meta text-ink/55">
                    {pluralize(c.followerCount ?? 0, 'follower')}
                  </p>
                </div>
              </Link>
            );
          })}
      </div>

      {!loading && companies.length === 0 && (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
            <Building2 className="size-6" />
          </div>
          <p className="text-section-title">No company pages yet</p>
          <p className="text-body-md text-ink/60">
            Be the first — create a company page for your restaurant or group.
          </p>
          <CreateCompanyDialog
            onCreated={(company) => setCompanies((prev) => [company, ...prev])}
          />
        </Card>
      )}
    </AppPage>
  );
}
