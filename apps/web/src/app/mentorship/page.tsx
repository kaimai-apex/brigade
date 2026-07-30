'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AppPage } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { formatMoney, splitPrice } from '@/lib/mentorship/pricing';
import { zonedWallTimeToUtc, type AvailabilityRule } from '@/lib/mentorship/availability';

type Mentor = {
  userId: string;
  headline: string | null;
  bio: string | null;
  timezone: string;
  currency: string;
  status: 'draft' | 'active' | 'paused';
  minNoticeHours: number;
  bookingHorizonDays: number;
  defaultMeetingUrl: string | null;
};

type SessionType = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
};

type Exception = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + (m || 0);
}
function toTimeValue(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export default function MentorshipPage() {
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [paymentsOn, setPaymentsOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/mentorship/me');
    const json = await res.json();
    setMentor(json.mentor ?? null);
    setSessionTypes(json.sessionTypes ?? []);
    setRules(json.availability ?? []);
    setExceptions(json.exceptions ?? []);
    setPaymentsOn(Boolean(json.paymentsConfigured));
    setLoading(false);
  }, []);

  async function addTimeOff(form: HTMLFormElement) {
    const data = new FormData(form);
    const from = String(data.get('from') ?? '');
    const to = String(data.get('to') ?? '');
    if (!from || !to) {
      toast.error('Pick both dates');
      return;
    }
    // Date inputs give a bare calendar day, which has to be anchored to the
    // MENTOR's timezone — not the browser's. `new Date("2026-09-01T00:00:00")`
    // means midnight where the editor happens to be sitting, so a mentor working
    // from a different zone than their profile would block the wrong hours at
    // each edge. Same helper the slot engine uses.
    const [fy, fm, fd] = from.split('-').map(Number);
    const [ty, tm, td] = to.split('-').map(Number);
    const startsAt = zonedWallTimeToUtc(fy, fm, fd, 0, mentor!.timezone);
    // End at the start of the following day so "away 1st–3rd" includes the 3rd.
    const endExclusive = new Date(Date.UTC(ty, tm - 1, td + 1));
    const endsAt = zonedWallTimeToUtc(
      endExclusive.getUTCFullYear(),
      endExclusive.getUTCMonth() + 1,
      endExclusive.getUTCDate(),
      0,
      mentor!.timezone,
    );

    const res = await fetch('/api/mentorship/me/exceptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: String(data.get('reason') ?? ''),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.message ?? 'Could not save time off');
      return;
    }
    form.reset();
    toast.success('Time off added');
    await load();
  }

  async function removeTimeOff(id: string) {
    const res = await fetch(`/api/mentorship/me/exceptions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Could not remove');
      return;
    }
    toast.success('Time off removed');
    await load();
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMentor(patch: Partial<Mentor>) {
    setSaving(true);
    try {
      const res = await fetch('/api/mentorship/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Could not save');
      setMentor(json);
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function addSessionType(form: HTMLFormElement) {
    const data = new FormData(form);
    const dollars = Number(data.get('price'));
    if (!Number.isFinite(dollars) || dollars < 0) {
      toast.error('Enter a price');
      return;
    }
    const res = await fetch('/api/mentorship/me/session-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: String(data.get('title') ?? ''),
        description: String(data.get('description') ?? ''),
        durationMinutes: Number(data.get('duration')),
        // The form collects currency units; the API and database only ever see
        // integer minor units.
        priceCents: Math.round(dollars * 100),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.message ?? 'Could not add session');
      return;
    }
    form.reset();
    toast.success('Session added');
    await load();
  }

  async function saveAvailability(next: AvailabilityRule[]) {
    const res = await fetch('/api/mentorship/me/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: next }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.message ?? 'Could not save availability');
      return;
    }
    setRules(json.data);
    toast.success('Availability saved');
  }

  if (loading) {
    return (
      <AppPage>
        <p className="text-ink/50">Loading…</p>
      </AppPage>
    );
  }

  if (!mentor) {
    return (
      <AppPage>
        <div className="mx-auto max-w-xl py-10 text-center">
          <h1 className="text-hero">Teach what you know</h1>
          <p className="mt-3 text-ink/70">
            Private chefs and hospitality leaders sell one-to-one sessions on Brigade. You set
            the price and the hours. Brigade takes 20% of each booking; the rest is yours.
          </p>
          <Button
            className="mt-6"
            disabled={saving}
            onClick={() =>
              saveMentor({
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                status: 'draft',
              })
            }
          >
            {saving ? 'Setting up…' : 'Set up mentoring'}
          </Button>
        </div>
      </AppPage>
    );
  }

  const canPublish = sessionTypes.some((s) => s.active) && rules.length > 0;

  return (
    <AppPage>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-hero">Your mentoring</h1>
          <p className="mt-1 text-ink/60">
            {mentor.status === 'active'
              ? 'Live in the mentor directory.'
              : mentor.status === 'paused'
                ? 'Paused — not taking new bookings.'
                : 'Draft — not visible to anyone yet.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/mentors">View directory</Link>
          </Button>
          {mentor.status === 'active' ? (
            <Button variant="outline" onClick={() => saveMentor({ status: 'paused' })}>
              Pause bookings
            </Button>
          ) : (
            <Button
              disabled={!canPublish || saving}
              onClick={() => saveMentor({ status: 'active' })}
              title={canPublish ? undefined : 'Add a session and some hours first'}
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      {!canPublish && mentor.status !== 'active' && (
        <p className="mb-6 rounded-lg border border-ink/10 bg-ink/5 p-3 text-sm text-ink/70">
          Add at least one session and one weekly window before publishing — an empty page is
          worse than no page.
        </p>
      )}

      {!paymentsOn && (
        <p className="mb-6 rounded-lg border border-rust/30 bg-rust/5 p-3 text-sm text-rust">
          Payments are not configured on this deployment, so bookings reserve time without
          charging. Set STRIPE_SECRET_KEY to collect money.
        </p>
      )}

      {/* ---------------------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold">How you introduce yourself</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            void saveMentor({
              headline: String(data.get('headline') ?? ''),
              bio: String(data.get('bio') ?? ''),
              minNoticeHours: Number(data.get('notice')),
              defaultMeetingUrl: String(data.get('meeting') ?? ''),
            });
          }}
        >
          <label className="block">
            <span className="text-meta font-semibold">Headline</span>
            <input
              name="headline"
              defaultValue={mentor.headline ?? ''}
              placeholder="Private chef · 15 years · menus and costing"
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-meta font-semibold">What people get</span>
            <textarea
              name="bio"
              defaultValue={mentor.bio ?? ''}
              rows={4}
              placeholder="Bring a menu, leave with margins."
              className="mt-1 w-full rounded-lg border border-ink/15 p-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-meta font-semibold">Your meeting room</span>
            <input
              name="meeting"
              type="url"
              defaultValue={mentor.defaultMeetingUrl ?? ''}
              placeholder="https://meet.google.com/your-room"
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
            <span className="text-meta mt-1 block text-ink/50">
              Sent to the other person when you accept a session. Leave blank to add one
              per booking.
            </span>
          </label>
          <label className="block max-w-xs">
            <span className="text-meta font-semibold">Minimum notice (hours)</span>
            <input
              name="notice"
              type="number"
              min={0}
              max={336}
              defaultValue={mentor.minNoticeHours}
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <Button type="submit" disabled={saving}>
            Save
          </Button>
        </form>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold">What you sell</h2>
        {sessionTypes.length > 0 && (
          <ul className="mt-3 space-y-2">
            {sessionTypes.map((s) => {
              const split = splitPrice(s.priceCents);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-ink/10 p-3"
                >
                  <div>
                    <p className="font-medium">
                      {s.title}{' '}
                      {!s.active && <span className="text-meta text-ink/40">(inactive)</span>}
                    </p>
                    <p className="text-meta text-ink/50">{s.durationMinutes} minutes</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatMoney(s.priceCents, mentor.currency)}
                    </p>
                    <p className="text-meta text-ink/50">
                      you keep {formatMoney(split.mentorPayoutCents, mentor.currency)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="mt-4 grid gap-3 rounded-lg border border-ink/10 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void addSessionType(e.currentTarget);
          }}
        >
          <label className="block sm:col-span-2">
            <span className="text-meta font-semibold">Title</span>
            <input
              name="title"
              required
              placeholder="Menu & costing 1:1"
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-meta font-semibold">Description</span>
            <input
              name="description"
              placeholder="What they should bring, what they leave with"
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-meta font-semibold">Minutes</span>
            <input
              name="duration"
              type="number"
              min={15}
              max={480}
              step={15}
              defaultValue={60}
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-meta font-semibold">Price ({mentor.currency.toUpperCase()})</span>
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={150}
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="outline">
              Add session
            </Button>
          </div>
        </form>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold">Weekly hours</h2>
        <p className="text-meta mt-1 text-ink/50">
          In {mentor.timezone.replace(/_/g, ' ')}. These repeat every week.
        </p>

        <ul className="mt-3 space-y-2">
          {rules.map((rule, index) => (
            <li key={index} className="flex flex-wrap items-center gap-2">
              <select
                value={rule.weekday}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, weekday: Number(e.target.value) };
                  setRules(next);
                }}
                aria-label="Day"
                className="h-12 rounded-lg border border-ink/15 px-2 text-base"
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={toTimeValue(rule.startMinute)}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, startMinute: toMinutes(e.target.value) };
                  setRules(next);
                }}
                aria-label="Start time"
                className="h-12 rounded-lg border border-ink/15 px-2 text-base"
              />
              <span className="text-ink/40">to</span>
              <input
                type="time"
                value={toTimeValue(rule.endMinute)}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, endMinute: toMinutes(e.target.value) };
                  setRules(next);
                }}
                aria-label="End time"
                className="h-12 rounded-lg border border-ink/15 px-2 text-base"
              />
              <button
                type="button"
                onClick={() => setRules(rules.filter((_, i) => i !== index))}
                className="text-meta text-rust hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setRules([...rules, { weekday: 2, startMinute: 9 * 60, endMinute: 12 * 60 }])
            }
          >
            Add a window
          </Button>
          <Button onClick={() => saveAvailability(rules)}>Save hours</Button>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold">Time off</h2>
        <p className="text-meta mt-1 text-ink/50">
          Holidays and one-off blocks. These override your weekly hours, so nobody can
          book you while you are away.
        </p>

        {exceptions.length > 0 && (
          <ul className="mt-3 space-y-2">
            {exceptions.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink/10 p-3"
              >
                <div>
                  <p className="font-medium">
                    {formatBlock(e.startsAt, e.endsAt, mentor.timezone)}
                  </p>
                  {e.reason && <p className="text-meta text-ink/50">{e.reason}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeTimeOff(e.id)}
                  className="text-meta text-rust hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-4 grid gap-3 rounded-lg border border-ink/10 p-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            void addTimeOff(e.currentTarget);
          }}
        >
          <label className="block">
            <span className="text-meta font-semibold">From</span>
            <input
              name="from"
              type="date"
              required
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-meta font-semibold">To</span>
            <input
              name="to"
              type="date"
              required
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-meta font-semibold">Reason (optional)</span>
            <input
              name="reason"
              placeholder="Service week"
              className="mt-1 h-12 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <div className="sm:col-span-3">
            <Button type="submit" variant="outline">
              Add time off
            </Button>
          </div>
        </form>
      </section>
    </AppPage>
  );
}

/**
 * The stored end is exclusive (start of the next day), so show the day before.
 *
 * Rendered in the mentor's timezone, matching how it was entered — otherwise a
 * block created as "1st–3rd" reads back as "31st–2nd" to anyone whose browser
 * sits west of that zone.
 */
function formatBlock(startsAt: string, endsAt: string, timeZone: string) {
  const start = new Date(startsAt);
  const lastDay = new Date(new Date(endsAt).getTime() - 1);
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  });
  const from = fmt.format(start);
  const to = fmt.format(lastDay);
  return from === to ? from : `${from} – ${to}`;
}
