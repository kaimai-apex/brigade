'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Briefcase, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { HudCard } from '@/components/layout/app-shell';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/**
 * LinkedIn-style "Open to work" control — critical for hospitality where
 * staffing is immediate. Toggles openToOpportunities on the profile.
 */
export function OpenToWorkCard() {
  const { session } = useAuth();
  const [openToWork, setOpenToWork] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.userId) return;
    let active = true;
    api
      .getProfile(session.userId)
      .then((res) => {
        if (!active) return;
        const p = res as Record<string, unknown>;
        setOpenToWork(Boolean(p.openToOpportunities ?? p.open_to_opportunities));
      })
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [session?.userId]);

  async function toggle() {
    if (!session?.userId || saving) return;
    const next = !openToWork;
    setSaving(true);
    setOpenToWork(next);
    try {
      await api.updateProfile(session.userId, { openToOpportunities: next });
      toast.success(
        next
          ? 'You’re marked Open to work — venues and your Brigade can find you faster'
          : 'Open to work turned off',
      );
    } catch (e) {
      setOpenToWork(!next);
      toast.error(e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setSaving(false);
    }
  }

  if (!session || loading) return null;

  return (
    <HudCard className="p-3">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={cn(
          'flex w-full items-start gap-3 rounded-md p-2 text-left transition hover:bg-neutral-50',
          openToWork && 'bg-forest/5',
        )}
      >
        <span
          className={cn(
            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
            openToWork ? 'bg-forest text-white' : 'bg-neutral-100 text-neutral-500',
          )}
        >
          {openToWork ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Briefcase className="size-5" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">
            {openToWork ? 'Open to work' : 'Show you’re open to work'}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-neutral-600">
            {openToWork
              ? 'Visible to venues and managers looking to build their team.'
              : 'Hospitality staffing moves fast — let venues know you’re available.'}
          </span>
        </span>
      </button>
    </HudCard>
  );
}
