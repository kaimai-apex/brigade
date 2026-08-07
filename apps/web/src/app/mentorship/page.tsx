"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppPage } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { MentorCardPreview } from "@/components/mentorship/setup/card-preview";
import { formatMoney } from "@/lib/mentorship/pricing";
import type { SetupState } from "@/components/mentorship/setup/types";

/**
 * The mentoring dashboard — status, earnings, link back to the short setup form.
 */

const EMPTY_PROFILE = {
  firstName: null,
  lastName: null,
  avatarUrl: null,
  role: null,
  city: null,
  state: null,
  country: null,
  currentEmployer: null,
  yearsExperience: null,
};

type Booking = {
  id: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed";
  startsAt: string;
  currency: string;
  mentorPayoutCents: number;
  refundedCents: number;
};

export default function MentorshipDashboard() {
  const router = useRouter();
  const [state, setState] = useState<SetupState>({
    mentor: null,
    sessionTypes: [],
    availability: [],
    profile: EMPTY_PROFILE,
    readiness: null,
    paymentsConfigured: true,
    draft: {},
  });
  const [teaching, setTeaching] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [meRes, bookingsRes] = await Promise.all([
      fetch("/api/mentorship/me", { cache: "no-store" }),
      fetch("/api/mentorship/bookings", { cache: "no-store" }),
    ]);

    if (meRes.ok) {
      const json = await meRes.json();
      setState({
        mentor: json.mentor ?? null,
        sessionTypes: json.sessionTypes ?? [],
        availability: json.availability ?? [],
        profile: json.profile ?? EMPTY_PROFILE,
        readiness: json.readiness ?? null,
        paymentsConfigured: json.paymentsConfigured !== false,
        draft: {},
      });
    }
    if (bookingsRes.ok) {
      const json = await bookingsRes.json();
      setTeaching(json.teaching ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading && !state.mentor) router.replace("/mentorship/setup");
  }, [loading, state.mentor, router]);

  async function setStatus(status: "active" | "paused") {
    setBusy(true);
    try {
      const res = await fetch("/api/mentorship/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Could not save");
        return;
      }
      toast.success(status === "active" ? "You are live" : "Bookings paused");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading || !state.mentor) {
    return (
      <AppPage>
        <p className="text-[var(--mk-muted)]">Loading…</p>
      </AppPage>
    );
  }

  const mentor = state.mentor;
  const readiness = state.readiness;

  const confirmed = teaching.filter(
    (booking) => booking.status === "confirmed" || booking.status === "completed",
  );
  const earnedCents = confirmed.reduce(
    (total, booking) => total + booking.mentorPayoutCents - booking.refundedCents,
    0,
  );
  const upcoming = confirmed
    .filter((booking) => new Date(booking.startsAt).getTime() > Date.now())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const awaitingPayment = teaching.filter((booking) => booking.status === "pending_payment");

  return (
    <AppPage>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mk-title">Your mentoring</h1>
          <p className="mt-1 text-[15px] text-[var(--mk-muted)]">
            {mentor.status === "active"
              ? "Live in the mentor directory."
              : mentor.status === "paused"
                ? "Paused — not taking new bookings."
                : "Draft — nobody can see this yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/mentorship/setup">Edit your card</Link>
          </Button>
          {mentor.status === "active" ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/mentors/${mentor.userId}`}>View public page</Link>
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setStatus("paused")}>
                Pause bookings
              </Button>
            </>
          ) : (
            <Button
              disabled={busy || !readiness?.canPublish}
              onClick={() => setStatus("active")}
              title={
                readiness?.canPublish
                  ? undefined
                  : `Still to do: ${readiness?.blocking.map((b) => b.label).join(", ")}`
              }
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      {readiness && !readiness.canPublish && (
        <div className="mb-8 rounded-xl border border-[var(--mk-line)] bg-[var(--mk-warn-bg)] p-4">
          <p className="text-[15px] font-medium text-[var(--mk-text)]">
            {readiness.percentComplete}% set up — a few things left before you can go live
          </p>
          <ul className="mt-2 space-y-1">
            {readiness.blocking.map((item) => (
              <li key={item.id} className="text-[14px] text-[var(--mk-muted)]">
                ·{" "}
                <Link
                  href="/mentorship/setup"
                  className="underline underline-offset-4 hover:text-[var(--mk-text)]"
                >
                  {item.label}
                </Link>{" "}
                — {item.hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="text-[18px] font-semibold text-[var(--mk-text)]">At a glance</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Earned"
                value={formatMoney(earnedCents, mentor.currency)}
                note="after Brigade's 20%"
              />
              <Stat
                label="Upcoming"
                value={String(upcoming.length)}
                note={upcoming.length === 1 ? "session booked" : "sessions booked"}
              />
              <Stat
                label="Awaiting payment"
                value={String(awaitingPayment.length)}
                note="not confirmed yet"
              />
            </dl>
            {confirmed.length > 0 && (
              <p className="mt-3 text-[14px]">
                <Link
                  href="/sessions"
                  className="text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
                >
                  See all your sessions
                </Link>
              </p>
            )}
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--mk-text)]">Your offer</h2>
            <ul className="mt-3 space-y-2">
              {state.sessionTypes
                .filter((type) => type.active)
                .map((type) => (
                  <li
                    key={type.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-[var(--mk-line)] p-3"
                  >
                    <span className="text-[15px] text-[var(--mk-text)]">
                      {type.title}{" "}
                      <span className="text-[var(--mk-subtle)]">
                        · {type.durationMinutes} min
                      </span>
                    </span>
                    <span className="text-[15px] font-semibold text-[var(--mk-text)]">
                      {type.priceCents === 0
                        ? "Free"
                        : formatMoney(type.priceCents, mentor.currency)}
                    </span>
                  </li>
                ))}
            </ul>
            {(mentor.calendlyUrl || mentor.defaultMeetingUrl) && (
              <p className="mt-3 text-[14px] text-[var(--mk-muted)]">
                Scheduling via Calendly after payment.
              </p>
            )}
            <p className="mt-3 text-[14px]">
              <Link
                href="/mentorship/setup"
                className="text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
              >
                Edit your mentor card
              </Link>
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <MentorCardPreview state={state} />
        </aside>
      </div>
    </AppPage>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-[var(--mk-line)] p-4">
      <dt className="text-[13px] font-semibold uppercase tracking-wide text-[var(--mk-subtle)]">
        {label}
      </dt>
      <dd>
        <span className="mt-1 block text-[22px] font-semibold text-[var(--mk-text)]">
          {value}
        </span>
        <span className="text-[13px] text-[var(--mk-subtle)]">{note}</span>
      </dd>
    </div>
  );
}
