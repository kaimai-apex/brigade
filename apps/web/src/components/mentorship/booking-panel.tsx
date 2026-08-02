"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMoney, splitPrice } from "@/lib/mentorship/pricing";
import type { SessionType } from "@/lib/server/mentorship-db";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const pathname = usePathname();
  const [selectedId, setSelectedId] = useState(sessionTypes[0]?.id ?? "");
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
      const res = await fetch("/api/mentorship/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorUserId,
          sessionTypeId: selected.id,
          startsAt: chosen,
        }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          toast.message("Log in to book this session");
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        toast.error(json.message ?? "Could not book");
        // 409 means somebody took it while this page was open — the times on
        // screen are stale, so replace them rather than leaving a dead button.
        if (res.status === 409) await loadSlots();
        return;
      }
      toast.success(`Reserved with ${mentorName}`);
      await loadSlots();
    } catch {
      toast.error("Could not book");
    } finally {
      setBooking(false);
    }
  }

  if (sessionTypes.length === 0) {
    return (
      <div className="mk-card p-6">
        <p className="text-[15px] text-[var(--mk-muted)]">
          This mentor has not published any sessions yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mk-card p-6 shadow-[var(--mk-shadow-card)]">
      <h2 className="text-[22px] font-semibold text-[var(--mk-text)]">Available sessions</h2>
      <p className="mt-1.5 text-[14px] text-[var(--mk-muted)]">
        Book 1:1 sessions from the options based on your needs
      </p>

      <ul className="mt-5 space-y-3">
        {sessionTypes.map((type) => {
          const active = type.id === selectedId;
          return (
            <li key={type.id}>
              <button
                type="button"
                onClick={() => setSelectedId(type.id)}
                aria-pressed={active}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-[var(--mk-ink)] bg-[var(--mk-ink)] text-white"
                    : "border-[var(--mk-line)] hover:bg-[#F4F6F7]",
                )}
              >
                <p className="text-[16px] font-medium leading-snug">{type.title}</p>
                <p
                  className={cn(
                    "mt-1 text-[13px]",
                    active ? "text-white/70" : "text-[var(--mk-muted)]",
                  )}
                >
                  {type.durationMinutes} minutes
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex h-9 items-center rounded-lg px-4 text-[14px] font-semibold",
                      active
                        ? "bg-white/15 text-white"
                        : "shadow-[inset_0_0_0_1px_#d7dee1] text-[var(--mk-text)]",
                    )}
                  >
                    Book
                  </span>
                  <span className="text-[15px] font-semibold">
                    {formatMoney(type.priceCents, currency)}
                  </span>
                </div>
                {type.description && (
                  <p
                    className={cn(
                      "mt-2 text-[14px]",
                      active ? "text-white/85" : "text-[var(--mk-muted)]",
                    )}
                  >
                    {type.description}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mk-subtle)]">
          Available times
        </h3>
        <p className="mt-1 text-[13px] text-[var(--mk-subtle)]">
          Shown in your timezone · mentor is in {timezone.replace(/_/g, " ")}
        </p>

        {slots === null ? (
          <p className="mt-3 text-[14px] text-[var(--mk-muted)]">Loading times…</p>
        ) : slots.length === 0 ? (
          <p className="mt-3 text-[14px] text-[var(--mk-muted)]">
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
                    className={cn(
                      "w-full rounded-lg border px-2 py-2 text-[14px] transition-colors",
                      active
                        ? "border-[var(--mk-ink)] bg-[var(--mk-ink)] text-white"
                        : "border-[var(--mk-line)] hover:border-[var(--mk-ink)]",
                    )}
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
        <p className="mt-4 text-[13px] text-[var(--mk-subtle)]">
          {formatMoney(selected.priceCents, currency)} · Brigade keeps{" "}
          {formatMoney(splitPrice(selected.priceCents).platformFeeCents, currency)} (20%), the
          mentor receives{" "}
          {formatMoney(splitPrice(selected.priceCents).mentorPayoutCents, currency)}.
        </p>
      )}

      {isSelf ? (
        <p className="mt-4 rounded-lg bg-[#F4F6F7] p-3 text-[14px] text-[var(--mk-muted)]">
          This is your own mentor page.
        </p>
      ) : paused ? (
        <p className="mt-4 rounded-lg bg-[#FFF6E6] p-3 text-[13px] text-[#7A5B00]">
          This mentor has paused new bookings.
        </p>
      ) : (
        <>
          <button
            type="button"
            className="mk-btn mk-btn-dark mt-4 w-full"
            disabled={!chosen || booking}
            onClick={book}
          >
            {booking ? "Reserving…" : "Reserve this time"}
          </button>
          {!paymentsEnabled && (
            <p className="mt-2 text-[13px] text-[#7A5B00]">
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
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
