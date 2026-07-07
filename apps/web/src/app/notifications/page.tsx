'use client';

import { useEffect, useState } from 'react';
import { api, type Notification } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-black">Notifications</h1>
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className="flex items-start justify-between p-4">
              <div>
                <p className="font-semibold capitalize">{n.type.replace(/_/g, ' ')}</p>
                <p className="text-xs opacity-60">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.readAt && (
                <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>
                  Mark read
                </Button>
              )}
            </Card>
          ))}
          {items.length === 0 && !loading && (
            <p className="text-center opacity-60">No notifications yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
