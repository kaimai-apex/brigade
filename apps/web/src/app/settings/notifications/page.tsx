'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

const CHANNELS = [
  {
    key: 'in_app',
    label: 'In-app notifications',
    desc: 'Show alerts inside Brigade as they happen.',
  },
  {
    key: 'push',
    label: 'Push notifications',
    desc: 'Get notified on your device when you’re away.',
  },
  {
    key: 'email',
    label: 'Email notifications',
    desc: 'Receive a digest and important updates by email.',
  },
] as const;

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    in_app: true,
    push: true,
    email: true,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    // Persist via notification-service once backend integration is complete.
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success('Notification preferences saved');
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-lg px-6 py-10">
        <h1 className="font-display mb-2 text-3xl font-black">Settings</h1>
        <p className="mb-8 text-ink/65">Manage how Brigade keeps you in the loop.</p>

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold">Notifications</h2>
          <p className="mt-1 text-sm text-ink/60">
            Choose where you want to hear from us.
          </p>
          <Separator className="my-5" />

          <div className="space-y-1">
            {CHANNELS.map((channel, i) => (
              <div key={channel.key}>
                {i > 0 && <Separator className="my-1" />}
                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="space-y-0.5">
                    <Label htmlFor={channel.key} className="font-semibold">
                      {channel.label}
                    </Label>
                    <p className="text-sm text-ink/55">{channel.desc}</p>
                  </div>
                  <Switch
                    id={channel.key}
                    checked={prefs[channel.key]}
                    onCheckedChange={(v) =>
                      setPrefs((p) => ({ ...p, [channel.key]: v }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
