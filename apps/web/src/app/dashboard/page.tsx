'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Bookmark,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { StartPostComposer } from '@/components/feed/start-post-composer';
import { OpenToWorkCard } from '@/components/profile/open-to-work-card';
import {
  AppShell,
  HudCard,
  useAppUser,
} from '@/components/layout/app-shell';
import { api, type ProfileViews, type Recommendation } from '@/lib/api/client';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { resolveBannerUrl } from '@/lib/banners';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { displayName, getInitials } from '@/lib/utils';

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
  const user = useAppUser(session?.userId);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [views, setViews] = useState<ProfileViews | null>(null);

  const name = user ? displayName(user.firstName, user.lastName) : 'Member';
  const initials = getInitials(user?.firstName, user?.lastName);

  useEffect(() => {
    api
      .getRecommendedPeople()
      .then((res) => setRecommendations(res.data.slice(0, 4)))
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

  const leftSidebar = (
    <>
      <HudCard className="overflow-hidden p-0">
        <div
          className="h-14 bg-cover bg-center"
          style={{
            backgroundImage: `url(${resolveBannerUrl(user?.coverUrl, session?.userId)})`,
          }}
        />
        <div className="px-3 pb-3">
          <Link href={session ? `/profile/${session.userId}` : '#'} className="-mt-8 block">
            <ProfileAvatar
              src={user?.avatarUrl}
              seed={session?.userId}
              firstName={user?.firstName}
              lastName={user?.lastName}
              alt={name}
              className="size-[72px] border-2 border-white"
              fallbackClassName="text-lg font-bold"
            />
          </Link>
          <Link
            href={session ? `/profile/${session.userId}` : '#'}
            className="mt-2 block font-semibold text-ink hover:underline"
          >
            {name}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-600">
            {user?.headline ||
              [user?.role, user?.city].filter(Boolean).join(' · ') ||
              'Hospitality professional on Brigade'}
          </p>
          {user?.openToOpportunities && (
            <Badge className="mt-2 bg-forest text-white">Open to work</Badge>
          )}
        </div>
      </HudCard>

      <OpenToWorkCard />

      {views && (
        <HudCard className="px-3 py-3">
          <div className="flex items-center justify-between border-b border-neutral-100 py-2 text-xs">
            <span className="text-neutral-600">Profile viewers</span>
            <span className="font-semibold text-forest">{views.uniqueViewers}</span>
          </div>
          <div className="flex items-center justify-between py-2 text-xs">
            <span className="text-neutral-600">Post impressions</span>
            <span className="font-semibold text-forest">—</span>
          </div>
        </HudCard>
      )}

      <HudCard className="px-2 py-2">
        {[
          { href: '/discover', label: 'Discover', icon: Users },
          { href: '/my-brigades', label: 'My Brigades', icon: UserPlus },
          { href: '/feed', label: 'Saved items', icon: Bookmark },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-2 py-2.5 text-neutral-700 transition hover:bg-neutral-50"
            >
              <Icon className="size-4 text-neutral-500" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </HudCard>
    </>
  );

  const rightSidebar = (
    <>
      <HudCard className="p-0">
        <div className="border-b border-neutral-100 px-3 py-2.5">
          <h2 className="text-sm font-semibold text-neutral-600">Hospitality pulse</h2>
        </div>
        <ul className="divide-y divide-neutral-100">
          {[
            'Wedding season staffing: what venues need this weekend',
            'Emergency shift coverage — how brigades fill last-minute gaps',
            'Fine dining vs banquet: skills recruiters search for',
          ].map((headline) => (
            <li key={headline}>
              <Link
                href="/discover"
                className="block w-full px-3 py-2.5 text-left text-xs leading-snug hover:bg-neutral-50"
              >
                <span className="font-semibold text-ink">{headline}</span>
                <span className="mt-1 block text-neutral-500">Talent · Brigade</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/discover?openToWork=1"
          className="block px-3 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          Browse talent open to work →
        </Link>
      </HudCard>

      <HudCard className="p-3">
        <h2 className="mb-1 text-sm font-semibold">People you may know</h2>
        <p className="mb-3 text-xs text-neutral-500">
          {user?.city
            ? `Grow your network in ${user.city} — connect with hospitality pros nearby.`
            : 'Connect with hospitality pros to build your first Brigade.'}
        </p>
        <ul className="space-y-3">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex gap-2">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </li>
            ))}
          {!loading &&
            recommendations.map((person) => (
              <li key={person.userId} className="flex items-start gap-2">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-neutral-100 text-sm font-semibold text-forest">
                    {initialsFromName(person.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${person.userId}`}
                    className="line-clamp-1 text-sm font-semibold hover:underline"
                  >
                    {person.name}
                  </Link>
                  {person.headline && (
                    <p className="line-clamp-2 text-xs text-neutral-600">{person.headline}</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 rounded-full px-3 text-xs"
                    disabled={connecting[person.userId]}
                    onClick={() => handleConnect(person)}
                  >
                    Connect
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      </HudCard>
    </>
  );

  return (
    <AppShell showAuth={false} left={leftSidebar} right={rightSidebar}>
            <StartPostComposer
              userName={name}
              userInitials={initials}
              avatarUrl={user?.avatarUrl}
              avatarSeed={session?.userId}
              onPost={(content, mediaUrl) => api.createPost(content, mediaUrl)}
            />

            <HudCard className="p-8 text-center">
              <p className="text-sm font-semibold text-neutral-700">
                Your hospitality feed starts here
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Share shifts you&apos;re available for, venues you&apos;ve worked, or tips from the
                floor — then discover talent open to work.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/discover">Find talent</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/opportunities">Browse opportunities</Link>
                </Button>
              </div>
            </HudCard>
    </AppShell>
  );
}
