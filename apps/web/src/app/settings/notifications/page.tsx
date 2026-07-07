'use client';

import { useState } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export default function NotificationSettingsPage() {
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-lg px-6 py-8">
        <h1 className="font-display mb-6 text-3xl font-black">Notification preferences</h1>
        <Card className="space-y-4 p-6">
          <Checkbox name="in_app" label="In-app notifications" defaultChecked />
          <Checkbox name="push" label="Push notifications" defaultChecked />
          <Checkbox name="email" label="Email notifications" defaultChecked />
          <p className="text-xs text-ink/50">
            Persist preferences via notification-service when backend integration is complete.
          </p>
          <Button onClick={save}>{saved ? 'Saved' : 'Save preferences'}</Button>
        </Card>
      </main>
    </div>
  );
}
