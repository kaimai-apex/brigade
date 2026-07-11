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
import { SiteHeader } from '@/components/layout/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function iconFor(type: string): LucideIcon {
  if (type.includes('connection') || type.includes('follow')) return UserPlus;
  if (type.includes('like')) return Heart;
  if (type.includes('comment') || type.includes('message')) return MessageCircle;
  if (type.includes('job')) return Briefcase;
  return Bell;
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
    await load();
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
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-black">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-rust text-paper">{unreadCount} new</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex items-center gap-3 p-4">
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
              return (
                <Card
                  key={n.id}
                  className={cn(
                    'flex items-center justify-between gap-3 p-4 transition',
                    unread && 'border-forest/30 bg-secondary/40',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full',
                        unread ? 'bg-forest text-paper' : 'bg-muted text-ink/60',
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold capitalize">
                        {n.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-ink/50">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {unread && (
                    <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </Card>
              );
            })}

          {!loading && items.length === 0 && (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
                <Bell className="size-6" />
              </div>
              <p className="font-display text-xl font-bold">You’re all caught up</p>
              <p className="text-sm text-ink/60">
                Notifications about your network, posts, and opportunities will show up here.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
