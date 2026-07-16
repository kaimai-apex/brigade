'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  Briefcase,
  Heart,
  MessageCircle,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { api, type Notification } from '@/lib/api/client';
import { AppPage } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, personLabel, relativeTime } from '@/lib/utils';

function iconFor(type: string): LucideIcon {
  if (type.includes('connection') || type.includes('follow')) return UserPlus;
  if (type.includes('like') || type.includes('react')) return Heart;
  if (type.includes('comment') || type.includes('message')) return MessageCircle;
  if (type.includes('job')) return Briefcase;
  return Bell;
}

function notificationCopy(n: Notification): { title: string; preview?: string } {
  const p = n.payload ?? {};
  const actor = personLabel(
    (p.actorName as string) ??
      (p.fromName as string) ??
      (p.userName as string) ??
      (p.name as string),
  );
  const preview =
    (p.postPreview as string) ??
    (p.content as string) ??
    (p.body as string) ??
    undefined;

  if (n.type.includes('like') || n.type.includes('react')) {
    return { title: `${actor} liked your post`, preview };
  }
  if (n.type.includes('comment')) {
    return { title: `${actor} commented on your post`, preview };
  }
  if (n.type.includes('connection') || n.type.includes('brigade')) {
    return { title: `${actor} invited you to their Brigade`, preview };
  }
  if (n.type.includes('follow')) {
    return { title: `${actor} followed you`, preview };
  }
  if (n.type.includes('message')) {
    return { title: `${actor} sent you a message`, preview };
  }
  return {
    title: personLabel(
      (p.message as string) ?? n.type.replace(/_/g, ' '),
      'New notification',
    ),
    preview,
  };
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setItems(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    await api.markNotificationRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  }

  async function markAllRead() {
    const unread = items.filter((n) => !n.readAt);
    if (unread.length === 0) return;
    await Promise.all(unread.map((n) => api.markNotificationRead(n.id)));
    toast.success('All caught up');
    await load();
  }

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <AppPage showAuth={false} mainClassName="py-4">
      <h1 className="text-page-title">Notifications</h1>
      <div className="mb-4 mt-1 flex items-center justify-between gap-2 text-[13px] text-ink/60">
        <span>{unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="touch-compact font-semibold text-forest underline-offset-2 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </Card>
          ))}

        {!loading &&
          items.map((n) => {
            const Icon = iconFor(n.type);
            const unread = !n.readAt;
            const { title, preview } = notificationCopy(n);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => unread && markRead(n.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition',
                  unread
                    ? 'border-forest/20 bg-forest/5'
                    : 'border-neutral-100 bg-white',
                )}
              >
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full',
                      unread ? 'bg-forest text-paper' : 'bg-muted text-ink/60',
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  {unread && (
                    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-forest" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold leading-snug">{title}</p>
                    <span className="shrink-0 text-meta text-ink/50">
                      {relativeTime(n.createdAt)}
                    </span>
                  </div>
                  {preview && (
                    <p className="mt-0.5 truncate text-meta text-ink/55">{preview}</p>
                  )}
                </div>
              </button>
            );
          })}

        {!loading && items.length === 0 && (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
              <Bell className="size-6" />
            </div>
            <p className="text-section-title">You&apos;re all caught up</p>
            <p className="text-body-md text-ink/60">
              Notifications about your Brigade and posts will show up here.
            </p>
          </Card>
        )}
      </div>
    </AppPage>
  );
}
