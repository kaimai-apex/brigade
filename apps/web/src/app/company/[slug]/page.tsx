'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Check, Users } from 'lucide-react';
import { api, type Company } from '@/lib/api/client';
import { AppPage } from '@/components/layout/app-shell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { pluralize } from '@/lib/utils';

export default function CompanyBySlugPage() {
  const params = useParams<{ slug: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    api
      .getCompany(params.slug)
      .then(setCompany)
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, [params.slug]);

  async function follow() {
    if (!company) return;
    try {
      await api.followCompany(company.id);
      setFollowing(true);
      setCompany((c) => (c ? { ...c, followerCount: (c.followerCount ?? 0) + 1 } : c));
      toast.success(`Following ${company.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to follow');
    }
  }

  return (
    <AppPage showAuth={false} mainClassName="py-4">
      {loading && (
        <Card className="p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-4 w-72" />
        </Card>
      )}

      {!loading && !company && (
        <Card className="p-10 text-center">
          <Building2 className="mx-auto size-10 text-neutral-400" />
          <p className="mt-4 text-section-title">Company not found</p>
        </Card>
      )}

      {!loading && company && (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="bg-forest/10 px-4 py-6 sm:px-6">
              <div className="flex items-start gap-3">
                <Avatar className="size-14 shrink-0 border border-neutral-200">
                  <AvatarFallback className="bg-white text-lg font-bold text-forest">
                    {company.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="break-words font-display text-2xl font-bold leading-tight">
                    {company.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {company.industry && (
                      <Badge variant="secondary">{company.industry}</Badge>
                    )}
                    {company.size && <Badge variant="outline">{company.size}</Badge>}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-meta text-ink/60">
                  {pluralize(company.followerCount ?? 0, 'follower')}
                </p>
                <Button
                  className="shrink-0"
                  variant={following ? 'default' : 'outline'}
                  onClick={follow}
                  disabled={following}
                >
                  {following ? (
                    <>
                      <Check className="size-4" /> Following
                    </>
                  ) : (
                    <>
                      <Users className="size-4" /> Follow
                    </>
                  )}
                </Button>
              </div>
            </div>
            {(company.website || company.description) && (
              <>
                <Separator />
                <div className="space-y-3 p-4 text-body-md text-ink/70">
                  {company.website && (
                    <p>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-forest underline-offset-2 hover:underline"
                      >
                        {company.website}
                      </a>
                    </p>
                  )}
                  {company.description && <p>{company.description}</p>}
                </div>
              </>
            )}
          </Card>

          <section>
            <h2 className="text-section-title mb-2">About</h2>
            <p className="text-body-md text-ink/65">
              {company.description || 'No about section yet.'}
            </p>
          </section>

          <section>
            <h2 className="text-section-title mb-2">People</h2>
            <p className="text-body-md text-ink/65">
              No people listed yet — follow to see updates.
            </p>
          </section>

          <section>
            <h2 className="text-section-title mb-2">Posts</h2>
            <p className="text-body-md text-ink/65">
              No posts yet — follow to see updates.
            </p>
          </section>
        </div>
      )}
    </AppPage>
  );
}
