"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { zonedWallTimeToUtc } from "@/lib/mentorship/availability";

export interface TimeOffEntry {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

/**
 * Holidays and one-off blocks.
 *
 * Ongoing operations rather than setup, which is why this lives on the
 * mentoring dashboard and not in the become-a-mentor flow.
 */
export function TimeOff({
  entries,
  timezone,
  onChange,
}: {
  entries: TimeOffEntry[];
  timezone: string;
  onChange: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function add(form: HTMLFormElement) {
    const data = new FormData(form);
    const from = String(data.get("from") ?? "");
    const to = String(data.get("to") ?? "");
    if (!from || !to) {
      toast.error("Pick both dates");
      return;
    }

    // A date input gives a bare calendar day, which has to be anchored to the
    // MENTOR's timezone, not the browser's. `new Date("2026-09-01T00:00:00")`
    // means midnight wherever the editor happens to be sitting, so a mentor
    // working from a different zone than their profile would block the wrong
    // hours at each edge.
    const [fy, fm, fd] = from.split("-").map(Number);
    const [ty, tm, td] = to.split("-").map(Number);
    const startsAt = zonedWallTimeToUtc(fy, fm, fd, 0, timezone);
    // End at the start of the following day, so "away 1st–3rd" includes the 3rd.
    const endExclusive = new Date(Date.UTC(ty, tm - 1, td + 1));
    const endsAt = zonedWallTimeToUtc(
      endExclusive.getUTCFullYear(),
      endExclusive.getUTCMonth() + 1,
      endExclusive.getUTCDate(),
      0,
      timezone,
    );

    setBusy(true);
    try {
      const res = await fetch("/api/mentorship/me/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          reason: String(data.get("reason") ?? ""),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Could not save time off");
        return;
      }
      form.reset();
      toast.success("Time off added");
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/mentorship/me/exceptions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not remove");
        return;
      }
      toast.success("Time off removed");
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="text-[18px] font-semibold text-[var(--mk-text)]">Time off</h2>
      <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
        Overrides your weekly hours, so nobody can book you while you are away.
      </p>

      {entries.length > 0 && (
        <ul className="mt-3 space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--mk-line)] p-3"
            >
              <div>
                <p className="text-[15px] font-medium text-[var(--mk-text)]">
                  {formatBlock(entry.startsAt, entry.endsAt, timezone)}
                </p>
                {entry.reason && (
                  <p className="text-[13px] text-[var(--mk-subtle)]">{entry.reason}</p>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(entry.id)}
                className="text-[13px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)] disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 grid gap-3 rounded-xl border border-[var(--mk-line)] p-4 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          void add(event.currentTarget);
        }}
      >
        <label className="block">
          <span className="text-[13px] font-semibold text-[var(--mk-text)]">From</span>
          <input
            name="from"
            type="date"
            required
            className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-[var(--mk-text)]">To</span>
          <input
            name="to"
            type="date"
            required
            className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-[var(--mk-text)]">
            Reason (optional)
          </span>
          <input
            name="reason"
            placeholder="Service week"
            className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
          />
        </label>
        <div className="sm:col-span-3">
          <Button type="submit" variant="outline" disabled={busy}>
            Add time off
          </Button>
        </div>
      </form>
    </section>
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
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  });
  const from = fmt.format(start);
  const to = fmt.format(lastDay);
  return from === to ? from : `${from} – ${to}`;
}
