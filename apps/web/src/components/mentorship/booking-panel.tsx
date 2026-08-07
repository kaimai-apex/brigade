"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMoney, splitPrice } from "@/lib/mentorship/pricing";
import { CHECKOUT_WINDOW_MINUTES } from "@/lib/mentorship/holds";
import type { SessionType } from "@/lib/server/mentorship-db";
import { cn } from "@/lib/utils";

type Slot = { startsAt: string; endsAt: string };

/**
 * Book a mentor session.
 *
 * Calendly mentors: pay on Brigade, then schedule on Calendly (no slot grid).
 * Legacy mentors: pick a native slot, then Checkout / reserve.
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
  usesCalendly = false,
}: {
  mentorUserId: string;
  mentorName: string;
  currency: string;
  timezone: string;
  sessionTypes: SessionType[];
  isSelf: boolean;
  paymentsEnabled: boolean;
  paused: boolean;
  usesCalendly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedId, setSelectedId] = useState(sessionTypes[0]?.id ?? "");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const selected = sessionTypes.find((t) => t.id === selectedId);

  const loadSlots = useCallback(async () => {
    if (!selectedId || usesCalendly) return;
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
  }, [mentorUserId, selectedId, usesCalendly]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function book(opts?: { calendly?: boolean }) {
    if (!opts?.calendly && (!chosen || !selected)) return;
    setBooking(true);
    try {
      const res = await fetch("/api/mentorship/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          opts?.calendly
            ? {
                mentorUserId,
                sessionTypeId: selected?.id,
              }
            : {
                mentorUserId,
                sessionTypeId: selected!.id,
                startsAt: chosen,
              },
        ),
      });
      const json = (await res.json()) as {
        message?: string;
        checkoutUrl?: string | null;
        id?: string;
        calendlyUrl?: string | null;
      };
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          toast.message("Log in to book this session");
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        toast.error(json.message ?? "Could not book");
        if (res.status === 409 && !opts?.calendly) await loadSlots();
        return;
      }

      if (json.checkoutUrl) {
        window.location.assign(json.checkoutUrl);
        return;
      }

      toast.success(`Reserved with ${mentorName}`);
      if (json.id) {
        router.push(`/sessions/${json.id}`);
        return;
      }
      if (!opts?.calendly) await loadSlots();
    } catch {
      toast.error("Could not book");
    } finally {
      setBooking(false);
    }
  }

  if (sessionTypes.length === 0 && !usesCalendly) {
    return (
      <div className="mk-card p-6 shadow-[var(--mk-shadow-card)]">
        <h2 className="text-[22px] font-semibold text-[var(--mk-text)]">
          Available sessions
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--mk-muted)]">
          This mentor hasn&apos;t published bookable sessions yet. Check back
          soon, or browse other mentors.
        </p>
        <Link href="/mentors" className="mk-btn mk-btn-outline mt-5 h-10 px-5">
          Browse mentors
        </Link>
      </div>
    );
  }

  if (usesCalendly) {
    const priceCents = selected?.priceCents ?? sessionTypes[0]?.priceCents ?? 5000;
    const title = selected?.title ?? sessionTypes[0]?.title ?? "Mentorship session";
    const duration =
      selected?.durationMinutes ?? sessionTypes[0]?.durationMinutes ?? 30;

    return (
      <div className="mk-card p-6 shadow-[var(--mk-shadow-card)]">
        <h2 className="text-[22px] font-semibold text-[var(--mk-text)]">Book a session</h2>
        <p className="mt-1.5 text-[14px] text-[var(--mk-muted)]">
          Pay on Brigade, then pick a time on {mentorName.split(" ")[0]}&apos;s Calendly.
        </p>

        <div className="mt-5 rounded-xl border border-[var(--mk-line)] p-4">
          <p className="text-[16px] font-medium text-[var(--mk-text)]">{title}</p>
          <p className="mt-1 text-[13px] text-[var(--mk-muted)]">{duration} minutes</p>
          <p className="mt-3 text-[18px] font-semibold text-[var(--mk-text)]">
            {formatMoney(priceCents, currency)}
          </p>
        </div>

        {priceCents > 0 && (
          <p className="mt-4 text-[13px] text-[var(--mk-muted)]">
            Brigade keeps {formatMoney(splitPrice(priceCents).platformFeeCents, currency)}{" "}
            (20%).
          </p>
        )}

        {isSelf ? (
          <p className="mt-4 rounded-lg bg-[var(--mk-wash)] p-3 text-[14px] text-[var(--mk-muted)]">
            This is your own mentor page.
          </p>
        ) : paused ? (
          <p className="mt-4 rounded-lg bg-[var(--mk-warn-bg)] p-3 text-[13px] text-[var(--mk-badge-gold-text)]">
            This mentor has paused new bookings.
          </p>
        ) : (
          <>
            <button
              type="button"
              className="mk-btn mk-btn-dark mt-4 w-full"
              disabled={booking}
              onClick={() => void book({ calendly: true })}
            >
              {booking
                ? "Starting…"
                : paymentsEnabled && priceCents > 0
                  ? `Book & pay · ${formatMoney(priceCents, currency)}`
                  : "Book session"}
            </button>
            {paymentsEnabled && priceCents > 0 && (
              <p className="mt-2 text-[13px] text-[var(--mk-muted)]">
                Payment is taken by Stripe. After it clears, you get their Calendly link
                to choose a time. The hold lasts {CHECKOUT_WINDOW_MINUTES} minutes while
                you check out.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mk-card p-6 shadow-[var(--mk-shadow-card)]">
      <h2 className="text-[22px] font-semibold text-[var(--mk-text)]">Available sessions</h2>
      <p className="mt-1.5 text-[14px] text-[var(--mk-muted)]">
        Choose a session, then pick a time that works.
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
                    ? "border-[var(--mk-ink)] bg-[var(--mk-ink)] text-[var(--brand-white)]"
                    : "border-[var(--mk-line)] hover:bg-[var(--mk-wash)]",
                )}
              >
                <p className="text-[16px] font-medium leading-snug">{type.title}</p>
                <p
                  className={cn(
                    "mt-1 text-[13px]",
                    active ? "text-[var(--brand-white)]/70" : "text-[var(--mk-muted)]",
                  )}
                >
                  {type.durationMinutes} minutes
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex h-9 items-center rounded-lg px-4 text-[14px] font-semibold",
                      active
                        ? "bg-[var(--mk-surface)]/15 text-[var(--brand-white)]"
                        : "shadow-[inset_0_0_0_1px_var(--mk-chip-line)] text-[var(--mk-text)]",
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
                      active ? "text-[var(--brand-white)]/85" : "text-[var(--mk-muted)]",
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
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mk-muted)]">
          Available times
        </h3>
        <p className="mt-1 text-[13px] text-[var(--mk-muted)]">
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
                        ? "border-[var(--mk-ink)] bg-[var(--mk-ink)] text-[var(--brand-white)]"
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
        <p className="mt-4 text-[13px] text-[var(--mk-muted)]">
          {formatMoney(selected.priceCents, currency)} · Brigade keeps{" "}
          {formatMoney(splitPrice(selected.priceCents).platformFeeCents, currency)} (20%), the
          mentor receives{" "}
          {formatMoney(splitPrice(selected.priceCents).mentorPayoutCents, currency)}.
        </p>
      )}

      {isSelf ? (
        <p className="mt-4 rounded-lg bg-[var(--mk-wash)] p-3 text-[14px] text-[var(--mk-muted)]">
          This is your own mentor page.
        </p>
      ) : paused ? (
        <p className="mt-4 rounded-lg bg-[var(--mk-warn-bg)] p-3 text-[13px] text-[var(--mk-badge-gold-text)]">
          This mentor has paused new bookings.
        </p>
      ) : (
        <>
          <button
            type="button"
            className="mk-btn mk-btn-dark mt-4 w-full"
            disabled={!chosen || booking}
            onClick={() => void book()}
          >
            {booking
              ? "Reserving…"
              : paymentsEnabled && (selected?.priceCents ?? 0) > 0
                ? `Continue to payment · ${formatMoney(selected!.priceCents, currency)}`
                : "Reserve this time"}
          </button>
          {paymentsEnabled && (selected?.priceCents ?? 0) > 0 && (
            <p className="mt-2 text-[13px] text-[var(--mk-muted)]">
              Payment is taken by Stripe. The time is held for you for{" "}
              {CHECKOUT_WINDOW_MINUTES} minutes while you check out, and the session is only
              confirmed once the payment goes through.
            </p>
          )}
          {!paymentsEnabled && (
            <p className="mt-2 text-[13px] text-[var(--mk-badge-gold-text)]">
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
