'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Briefcase,
  Eye,
  MessageSquare,
  Newspaper,
  UserPlus,
  Users,
} from 'lucide-react';
import { api, type ProfileViews, type Recommendation } from '@/lib/api/client';
import { useAuth } from '@/components/auth/auth-provider';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const QUICK_LINKS = [
  { href: '/feed', label: 'Feed', desc: 'See network updates', icon: Newspaper },
  { href: '/connections', label: 'Network', desc: 'Manage connections', icon: Users },
  { href: '/jobs', label: 'Jobs', desc: 'Browse opportunities', icon: Briefcase },
  { href: '/messages', label: 'Messages', desc: 'Chat with peers', icon: MessageSquare },
];

function initialsFromName(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [views, setViews] = useState<ProfileViews | null>(null);

  useEffect(() => {
    api
      .getRecommendedPeople()
      .then((res) => setRecommendations(res.data.slice(0, 6)))
      .catch(() => setRecommendations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!session?.userId) return;
    api
      .getProfileViews(session.userId)
      .then(setViews)
      .catch(() => setViews(null));
  }, [session?.userId]);

  async function handleConnect(person: Recommendation) {
    setConnecting((p) => ({ ...p, [person.userId]: true }));
    try {
      await api.sendConnectionRequest(person.userId);
      toast.success(`Connection request sent to ${person.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request');
    } finally {
      setConnecting((p) => ({ ...p, [person.userId]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display mb-2 text-3xl font-black">Dashboard</h1>
        <p className="mb-8 text-ink/65">Your Brigade home base.</p>

        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <Card className="h-full p-5 transition group-hover:-translate-y-1 group-hover:shadow-md">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-forest">
                    <Icon className="size-5" />
                  </div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm text-ink/60">{item.desc}</p>
                </Card>
              </Link>
            );
          })}
        </div>

        {views && (
          <Card className="mb-12 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-forest">
                <Eye className="size-5" />
              </div>
              <div>
                <p className="font-display text-2xl font-black leading-none">
                  {views.uniqueViewers}
                </p>
                <p className="text-sm text-ink/60">
                  {views.uniqueViewers === 1 ? 'person has' : 'people have'} viewed
                  your profile
                </p>
              </div>
            </div>
            {views.recent.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
                {views.recent.slice(0, 8).map((v) => (
                  <Link
                    key={v.viewerId}
                    href={`/profile/${v.viewerId}`}
                    className="flex items-center gap-2 rounded-full border border-ink/10 bg-cream py-1 pl-1 pr-3 text-sm transition hover:bg-ink/5"
                  >
                    <Avatar size="sm">
                      <AvatarFallback className="bg-secondary text-[10px] font-semibold text-forest">
                        {v.name ? initialsFromName(v.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[10rem] truncate">
                      {v.name ?? 'Someone'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">People you may know</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </Card>
              ))}

            {!loading &&
              recommendations.map((person) => (
                <Card
                  key={person.userId}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar size="lg">
                      <AvatarFallback className="bg-secondary font-semibold text-forest">
                        {initialsFromName(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link
                        href={`/profile/${person.userId}`}
                        className="font-semibold hover:underline"
                      >
                        {person.name}
                      </Link>
                      {person.headline && (
                        <p className="truncate text-sm text-ink/60">{person.headline}</p>
                      )}
                      {person.reason && (
                        <Badge variant="secondary" className="mt-1">
                          {person.reason}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Connect with ${person.name}`}
                    disabled={connecting[person.userId]}
                    onClick={() => handleConnect(person)}
                  >
                    <UserPlus className="size-4" />
                  </Button>
                </Card>
              ))}

            {!loading && recommendations.length === 0 && (
              <Card className="sm:col-span-2 p-8 text-center">
                <p className="text-sm text-ink/60">
                  Complete your profile to get recommendations.
                </p>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
