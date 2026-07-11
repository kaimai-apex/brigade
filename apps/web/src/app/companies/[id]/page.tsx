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

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api
      .getCompany(params.id)
      .then(setCompany)
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, [params.id]);

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
    <AppPage showAuth={false}>
        {loading || !company ? (
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar className="size-16 border border-ink/10">
                <AvatarFallback className="bg-secondary text-forest">
                  <Building2 className="size-7" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="font-display text-3xl font-black">{company.name}</h1>
                <Badge variant="secondary" className="mt-2">
                  <Users className="size-3" />
                  {company.followerCount ?? 0} followers
                </Badge>
              </div>
              <Button
                variant={following ? 'outline' : 'default'}
                onClick={follow}
                disabled={following}
              >
                {following ? (
                  <>
                    <Check className="size-4" /> Following
                  </>
                ) : (
                  'Follow'
                )}
              </Button>
            </div>

            {company.description && (
              <>
                <Separator className="my-6" />
                <p className="leading-relaxed text-ink/75">{company.description}</p>
              </>
            )}
          </Card>
        )}
      </AppPage>
  );
}
