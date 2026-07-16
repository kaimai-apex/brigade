'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

export function InviteButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function invite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy || sent) return;
    setBusy(true);
    try {
      await api.sendConnectionRequest(userId);
      setSent(true);
      toast.success(`Invited ${name} to your Brigade`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send invite');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="touch-compact shrink-0 text-forest"
      onClick={invite}
      disabled={busy || sent}
      aria-label={sent ? 'Invited to Brigade' : 'Invite to Brigade'}
    >
      <UserPlus className="size-4" />
      <span className="hidden sm:inline">
        {sent ? 'Invited' : 'Invite to Brigade'}
      </span>
    </Button>
  );
}
