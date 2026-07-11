'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Bookmark,
  Image,
  Newspaper,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import {
  HudCard,
  useAppUser,
} from '@/components/layout/app-shell';
import { AppNav } from '@/components/layout/app-nav';
import { api, type ProfileViews, type Recommendation } from '@/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { displayName, formatLocation, getInitials } from '@/lib/utils';

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
  const [postDraft, setPostDraft] = useState('');
  const [unread, setUnread] = useState(0);

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

  useEffect(() => {
    api
      .getNotifications()
      .then((res) => setUnread(res.data.filter((n) => !n.read).length))
      .catch(() => setUnread(0));
  }, []);

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

  async function handlePost() {
    if (!postDraft.trim()) return;
    try {
      await api.createPost(postDraft.trim());
      setPostDraft('');
      toast.success('Posted to your network');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to post');
    }
  }

  const leftSidebar = (
    <>
      <HudCard>
        <div className="h-14 bg-gradient-to-r from-forest/80 to-cobalt/70" />
        <div className="px-3 pb-3">
          <Link href={session ? `/profile/${session.userId}` : '#'} className="-mt-8 block">
            <Avatar className="size-[72px] border-2 border-white">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
              <AvatarFallback className="bg-neutral-100 text-lg font-bold text-forest">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link
            href={session ? `/profile/${session.userId}` : '#'}
            className="mt-2 block font-semibold text-ink hover:underline"
          >
            {name}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-600">
            Hospitality professional on Brigade
          </p>
        </div>
      </HudCard>

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
          <h2 className="text-sm font-semibold text-neutral-600">Brigade news</h2>
        </div>
        <ul className="divide-y divide-neutral-100">
          {[
            'Hospitality hiring picks up for summer events',
            'How top brigades staff wedding season',
            'Private chef demand rises in major cities',
          ].map((headline) => (
            <li key={headline}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-xs leading-snug hover:bg-neutral-50"
              >
                <span className="font-semibold text-ink">{headline}</span>
                <span className="mt-1 block text-neutral-500">Trending · Brigade</span>
              </button>
            </li>
          ))}
        </ul>
        <Link
          href="/discover"
          className="block px-3 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          Show more
        </Link>
      </HudCard>

      <HudCard className="p-3">
        <h2 className="mb-3 text-sm font-semibold">Add to your network</h2>
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
    <div className="min-h-screen bg-white">
      <AppNav user={user ?? undefined} unreadNotifications={unread} />
      <div className="mx-auto max-w-[1128px] px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[225px_minmax(0,1fr)_300px]">
          <aside className="hidden space-y-2 lg:block">{leftSidebar}</aside>

          <main className="min-w-0 space-y-2">
            <HudCard className="p-3">
              <div className="flex gap-3">
                <Avatar className="size-12 shrink-0">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
                  <AvatarFallback className="bg-neutral-100 font-semibold text-forest">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  className="flex h-12 flex-1 items-center rounded-full border border-neutral-400 px-4 text-left text-sm text-neutral-500 transition hover:bg-neutral-50"
                  onClick={() => document.getElementById('post-composer')?.focus()}
                >
                  Start a post
                </button>
              </div>
              <div className="mt-2 flex justify-around border-t border-neutral-100 pt-2">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  <Image className="size-5 text-cobalt" />
                  Photo
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  <Newspaper className="size-5 text-rust" />
                  Article
                </button>
              </div>
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <Textarea
                  id="post-composer"
                  placeholder="Share an update with your network…"
                  value={postDraft}
                  onChange={(e) => setPostDraft(e.target.value)}
                  rows={3}
                  className="resize-none border-neutral-200 bg-white text-sm"
                />
                {postDraft.trim() && (
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" onClick={handlePost}>
                      Post
                    </Button>
                  </div>
                )}
              </div>
            </HudCard>

            <HudCard className="p-8 text-center">
              <p className="text-sm font-semibold text-neutral-700">Your feed will appear here</p>
              <p className="mt-1 text-xs text-neutral-500">
                Connect with professionals and share updates — just like your LinkedIn home.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/feed">View full feed</Link>
              </Button>
            </HudCard>
          </main>

          <aside className="hidden space-y-2 lg:block">{rightSidebar}</aside>
        </div>
      </div>
    </div>
  );
}
