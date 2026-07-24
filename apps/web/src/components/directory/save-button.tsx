'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/** Heart/bookmark a member to your shortlist. Optimistic, self-contained. */
export function SaveButton({
  userId,
  name,
  initialSaved = false,
  className,
}: {
  userId: string;
  name: string;
  initialSaved?: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      if (next) await api.saveMember(userId);
      else await api.unsaveMember(userId);
      toast.success(next ? `Saved ${name}` : `Removed ${name}`);
    } catch {
      setSaved(!next); // revert
      toast.error('Could not update your saved list');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full border transition-colors',
        saved
          ? 'border-gold bg-gold/15 text-gold'
          : 'border-neutral-200 bg-white text-neutral-500 hover:text-forest',
        className,
      )}
    >
      <Bookmark className={cn('size-4', saved && 'fill-current')} />
    </button>
  );
}
