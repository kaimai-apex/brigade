'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AppPage } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/mentorship/pricing';

type Booking = {
  id: string;
  mentorUserId: string;
  menteeUserId: string;
  startsAt: string;
  endsAt: string;
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'completed';
  currency: string;
  priceCents: number;
  platformFeeCents: number;
  mentorPayoutCents: number;
  meetingUrl: string | null;
};

const STATUS_LABEL: Record<Booking['status'], string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

/** Sessions you booked, and sessions you are teaching. */
export default function SessionsPage() {
  const [booked, setBooked] = useState<Booking[]>([]);
  const [teaching, setTeaching] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [paymentsOn, setPaymentsOn] = useState(true);

  const load = useCallback(async () => {
    try {
      const [res, me] = await Promise.all([
        fetch('/api/mentorship/bookings'),
        fetch('/api/mentorship/me'),
      ]);
      const json = (await res.json()) as { booked?: Booking[]; teaching?: Booking[] };
      setBooked(json.booked ?? []);
      setTeaching(json.teaching ?? []);
      // Accepting by hand is only offered while payments are off; with Stripe
      // on, a settled charge is what confirms a session.
      const meJson = (await me.json().catch(() => ({}))) as { paymentsConfigured?: boolean };
      setPaymentsOn(meJson.paymentsConfigured !== false);
    } finally {
      setLoading(false);
    }
  }, []);

  async function confirm(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/mentorship/bookings/${id}/confirm`, { method: 'POST' });
      const json = (await res.json()) as { message?: string; meetingUrl?: string | null };
      if (!res.ok) {
        toast.error(json.message ?? 'Could not confirm');
        return;
      }
      toast.success(
        json.meetingUrl
          ? 'Session confirmed — your meeting link was sent with it'
          : 'Session confirmed. Add a meeting room so people know where to join.',
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/mentorship/bookings/${id}/cancel`, { method: 'POST' });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(json.message ?? 'Could not cancel');
        return;
      }
      toast.success('Session cancelled');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <AppPage>
        <p className="text-ink/50">Loading…</p>
      </AppPage>
    );
  }

  const nothing = booked.length === 0 && teaching.length === 0;

  return (
    <AppPage>
      <h1 className="text-hero">Your sessions</h1>
      <p className="mt-1 text-ink/60">Mentorship you have booked, and time you are teaching.</p>

      {nothing ? (
        <div className="mt-8 rounded-xl border border-ink/10 p-10 text-center">
          <h2 className="text-lg font-semibold">No sessions yet</h2>
          <p className="mt-2 text-ink/60">
            Book time with someone who has done the job you want next.
          </p>
          <Button asChild className="mt-4">
            <Link href="/mentors">Find a mentor</Link>
          </Button>
        </div>
      ) : (
        <>
          <BookingList
            title="Booked"
            empty="You have not booked any sessions."
            bookings={booked}
            perspective="mentee"
            busyId={busyId}
            onCancel={cancel}
          />
          <BookingList
            title="Teaching"
            empty="Nobody has booked you yet."
            bookings={teaching}
            perspective="mentor"
            busyId={busyId}
            onCancel={cancel}
            onConfirm={paymentsOn ? undefined : confirm}
          />
        </>
      )}
    </AppPage>
  );
}

function BookingList({
  title,
  empty,
  bookings,
  perspective,
  busyId,
  onCancel,
  onConfirm,
}: {
  title: string;
  empty: string;
  bookings: Booking[];
  perspective: 'mentee' | 'mentor';
  busyId: string | null;
  onCancel: (id: string) => void;
  /** Absent when payments are on — the charge confirms the session instead. */
  onConfirm?: (id: string) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      {bookings.length === 0 ? (
        <p className="mt-2 text-ink/60">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {bookings.map((b) => {
            const past = new Date(b.endsAt) < new Date();
            const cancellable = !past && (b.status === 'confirmed' || b.status === 'pending_payment');
            const other = perspective === 'mentee' ? b.mentorUserId : b.menteeUserId;
            return (
              <li
                key={b.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ink/10 p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{formatRange(b.startsAt, b.endsAt)}</p>
                  <p className="text-meta mt-1 text-ink/50">
                    <Link href={`/profile/${other}`} className="hover:underline">
                      {perspective === 'mentee' ? 'with your mentor' : 'with your mentee'}
                    </Link>
                    {' · '}
                    <StatusBadge status={b.status} />
                  </p>
                  {b.meetingUrl && b.status === 'confirmed' && (
                    <a
                      href={b.meetingUrl}
                      className="text-meta mt-1 inline-block text-forest hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Join the call
                    </a>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-semibold">{formatMoney(b.priceCents, b.currency)}</p>
                  {/* Mentors care what lands, mentees care what leaves. */}
                  <p className="text-meta text-ink/50">
                    {perspective === 'mentor'
                      ? `you receive ${formatMoney(b.mentorPayoutCents, b.currency)}`
                      : `incl. ${formatMoney(b.platformFeeCents, b.currency)} Brigade fee`}
                  </p>
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    {onConfirm && !past && b.status === 'pending_payment' && (
                      <Button
                        size="sm"
                        disabled={busyId === b.id}
                        onClick={() => onConfirm(b.id)}
                      >
                        {busyId === b.id ? 'Confirming…' : 'Accept'}
                      </Button>
                    )}
                    {cancellable && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === b.id}
                        onClick={() => onCancel(b.id)}
                      >
                        {busyId === b.id ? 'Cancelling…' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const tone =
    status === 'confirmed'
      ? 'text-forest'
      : status === 'cancelled'
        ? 'text-ink/40'
        : status === 'pending_payment'
          ? 'text-rust'
          : 'text-ink/60';
  return <span className={tone}>{STATUS_LABEL[status]}</span>;
}

function formatRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${day}, ${time.format(start)}–${time.format(end)}`;
}
