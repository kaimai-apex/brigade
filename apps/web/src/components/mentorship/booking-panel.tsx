'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatMoney, splitPrice } from '@/lib/mentorship/pricing';
import type { SessionType } from '@/lib/server/mentorship-db';

type Slot = { startsAt: string; endsAt: string };

/**
 * Pick a session, pick a time, book it.
 *
 * Slots are re-fetched whenever the session type changes, because a 30-minute
 * and a 90-minute session divide the same availability window differently — the
 * list is not a filter over one fixed set of times.
 */
export function BookingPanel({
  mentorUserId,
  mentorName,
  currency,
  timezone,
  sessionTypes,
  isSelf,
  paymentsEnabled,
  paused,
}: {
  mentorUserId: string;
  mentorName: string;
  currency: string;
  timezone: string;
  sessionTypes: SessionType[];
  isSelf: boolean;
  paymentsEnabled: boolean;
  paused: boolean;
}) {
  const [selectedId, setSelectedId] = useState(sessionTypes[0]?.id ?? '');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const selected = sessionTypes.find((t) => t.id === selectedId);

  const loadSlots = useCallback(async () => {
    if (!selectedId) return;
    setSlots(null);
    setChosen(null);
    try {
      const res = await fetch(
        `/api/mentorship/mentors/${mentorUserId}?sessionTypeId=${selectedId}`,
      );
      const json = (await res.json()) as { slots?: Slot[] };
      setSlots(json.slots ?? []);
    } catch {
      setSlots([]);
    }
  }, [mentorUserId, selectedId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function book() {
    if (!chosen || !selected) return;
    setBooking(true);
    try {
      const res = await fetch('/api/mentorship/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorUserId,
          sessionTypeId: selected.id,
          startsAt: chosen,
        }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(json.message ?? 'Could not book');
        // 409 means somebody took it while this page was open — the times on
        // screen are stale, so replace them rather than leaving a dead button.
        if (res.status === 409) await loadSlots();
        return;
      }
      toast.success(`Reserved with ${mentorName}`);
      await loadSlots();
    } catch {
      toast.error('Could not book');
    } finally {
      setBooking(false);
    }
  }

  if (sessionTypes.length === 0) {
    return (
      <div className="rounded-xl border border-ink/10 p-6">
        <p className="text-ink/60">This mentor has not published any sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink/10 p-5">
      <h2 className="text-lg font-semibold">Book a session</h2>

      <div className="mt-4 space-y-2">
        {sessionTypes.map((type) => {
          const active = type.id === selectedId;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedId(type.id)}
              aria-pressed={active}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                active ? 'border-forest bg-forest/5' : 'border-ink/10 hover:border-ink/25'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{type.title}</span>
                <span className="font-semibold">
                  {formatMoney(type.priceCents, currency)}
                </span>
              </div>
              <p className="text-meta mt-1 text-ink/50">{type.durationMinutes} minutes</p>
              {type.description && (
                <p className="mt-1 text-sm text-ink/70">{type.description}</p>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <h3 className="text-meta font-semibold uppercase tracking-wide text-ink/50">
          Available times
        </h3>
        <p className="text-meta mt-1 text-ink/40">
          Shown in your timezone · mentor is in {timezone.replace(/_/g, ' ')}
        </p>

        {slots === null ? (
          <p className="mt-3 text-sm text-ink/50">Loading times…</p>
        ) : slots.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">
            No times available in the next few weeks.
          </p>
        ) : (
          <ul className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {slots.map((slot) => {
              const active = slot.startsAt === chosen;
              return (
                <li key={slot.startsAt}>
                  <button
                    type="button"
                    onClick={() => setChosen(slot.startsAt)}
                    aria-pressed={active}
                    className={`w-full rounded-lg border px-2 py-2 text-sm transition-colors ${
                      active
                        ? 'border-forest bg-forest text-white'
                        : 'border-ink/15 hover:border-forest'
                    }`}
                  >
                    {formatSlot(slot.startsAt)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <p className="text-meta mt-4 text-ink/50">
          {formatMoney(selected.priceCents, currency)} · Brigade keeps{' '}
          {formatMoney(splitPrice(selected.priceCents).platformFeeCents, currency)} (20%), the
          mentor receives{' '}
          {formatMoney(splitPrice(selected.priceCents).mentorPayoutCents, currency)}.
        </p>
      )}

      {isSelf ? (
        <p className="mt-4 rounded-lg bg-ink/5 p-3 text-sm text-ink/60">
          This is your own mentor page.
        </p>
      ) : paused ? (
        <p className="mt-4 rounded-lg bg-ink/5 p-3 text-sm text-ink/60">
          This mentor has paused new bookings.
        </p>
      ) : (
        <>
          <Button
            className="mt-4 w-full"
            disabled={!chosen || booking}
            onClick={book}
          >
            {booking ? 'Reserving…' : 'Reserve this time'}
          </Button>
          {!paymentsEnabled && (
            // Said plainly rather than hidden: a reservation that cannot be paid
            // for is not a confirmed session, and both people should know that
            // before they plan around it.
            <p className="text-meta mt-2 text-rust">
              Payments are not switched on yet, so this reserves the time but does not
              charge you. The mentor confirms directly.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function formatSlot(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
