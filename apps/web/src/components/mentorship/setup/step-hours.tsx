"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AvailabilityRule } from "@/lib/mentorship/availability";
import type { StepProps } from "./types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

function toTimeValue(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Every zone the runtime knows about.
 *
 * `Intl.supportedValuesOf` rather than a hand-kept list: a bundled list of
 * timezones is wrong the moment a country changes its rules, and this is the
 * one field where being wrong silently moves every session an hour.
 */
function allTimezones(): string[] {
  try {
    const supported = Intl.supportedValuesOf?.("timeZone");
    if (supported?.length) return supported;
  } catch {
    // Older runtime — fall through.
  }
  return [Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC"];
}

/** A sensible starting week: weekday evenings, when kitchen people are free. */
const DEFAULT_WEEK: AvailabilityRule[] = [
  { weekday: 2, startMinute: 15 * 60, endMinute: 18 * 60 },
  { weekday: 4, startMinute: 15 * 60, endMinute: 18 * 60 },
];

export function StepHours({ state, save, reload, saving, onNext }: StepProps) {
  const mentor = state.mentor;
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [timezone, setTimezone] = useState(mentor?.timezone ?? browserZone);
  const [rules, setRules] = useState<AvailabilityRule[]>(state.availability);
  const [notice, setNotice] = useState(String(mentor?.minNoticeHours ?? 12));
  const [busy, setBusy] = useState(false);

  const zones = useMemo(allTimezones, []);
  const zoneMismatch = mentor?.timezone && mentor.timezone !== browserZone;

  const totalHours = rules.reduce(
    (sum, rule) => sum + (rule.endMinute - rule.startMinute) / 60,
    0,
  );

  async function saveHours() {
    for (const rule of rules) {
      if (rule.endMinute <= rule.startMinute) {
        toast.error(`${WEEKDAYS[rule.weekday]}: the window has to end after it starts`);
        return;
      }
    }

    setBusy(true);
    try {
      // Timezone first: the windows are stored as wall-clock minutes and are
      // read back in whatever zone the mentor row says. Saving them in the
      // other order would briefly interpret the new hours in the old zone.
      const savedMentor = await save({
        timezone,
        minNoticeHours: Number(notice),
        onboardingStep: 3,
      });
      if (!savedMentor) return;

      const res = await fetch("/api/mentorship/me/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Could not save your hours");
        return;
      }
      await reload();
      toast.success("Hours saved");
      onNext();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-semibold text-[var(--mk-text)]">When you are free</h2>
        <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
          Weekly windows that repeat. People book inside them, in their own timezone —
          you never have to do the arithmetic.
        </p>
      </div>

      <label className="block max-w-md">
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">Your timezone</span>
        <select
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
        >
          {/* The current value may not be in the list on an older runtime. */}
          {!zones.includes(timezone) && <option value={timezone}>{timezone}</option>}
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        {zoneMismatch && (
          <span className="mt-1 block text-[13px] text-[var(--mk-badge-gold-text)]">
            Your browser says {browserZone.replace(/_/g, " ")}, but your mentoring hours are
            set in {mentor!.timezone.replace(/_/g, " ")}. Change it here if you have moved.
          </span>
        )}
      </label>

      <div>
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">Weekly hours</span>
        {rules.length === 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-[var(--mk-line)] p-4">
            <p className="text-[14px] text-[var(--mk-muted)]">
              No hours yet — nobody can book you until there is at least one window.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => setRules(DEFAULT_WEEK)}
            >
              Start with Tue &amp; Thu afternoons
            </Button>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {rules.map((rule, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2">
                <select
                  value={rule.weekday}
                  aria-label="Day"
                  onChange={(event) => {
                    const next = [...rules];
                    next[index] = { ...rule, weekday: Number(event.target.value) };
                    setRules(next);
                  }}
                  className="h-12 rounded-lg border border-[var(--mk-line)] px-2 text-base"
                >
                  {WEEKDAYS.map((day, i) => (
                    <option key={day} value={i}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  aria-label="Start time"
                  value={toTimeValue(rule.startMinute)}
                  onChange={(event) => {
                    const next = [...rules];
                    next[index] = { ...rule, startMinute: toMinutes(event.target.value) };
                    setRules(next);
                  }}
                  className="h-12 rounded-lg border border-[var(--mk-line)] px-2 text-base"
                />
                <span className="text-[var(--mk-subtle)]">to</span>
                <input
                  type="time"
                  aria-label="End time"
                  value={toTimeValue(rule.endMinute)}
                  onChange={(event) => {
                    const next = [...rules];
                    next[index] = { ...rule, endMinute: toMinutes(event.target.value) };
                    setRules(next);
                  }}
                  className="h-12 rounded-lg border border-[var(--mk-line)] px-2 text-base"
                />
                <button
                  type="button"
                  onClick={() => setRules(rules.filter((_, i) => i !== index))}
                  className="text-[13px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRules([...rules, { weekday: 2, startMinute: 9 * 60, endMinute: 12 * 60 }])
            }
          >
            Add a window
          </Button>
          {rules.length > 0 && (
            <span className="text-[13px] text-[var(--mk-subtle)]">
              {totalHours} hour{totalHours === 1 ? "" : "s"} a week, in{" "}
              {timezone.replace(/_/g, " ")}.
            </span>
          )}
        </div>
      </div>

      <label className="block max-w-xs">
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">
          Minimum notice (hours)
        </span>
        <input
          type="number"
          min={0}
          max={336}
          value={notice}
          onChange={(event) => setNotice(event.target.value)}
          className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
        />
        <span className="mt-1 block text-[13px] text-[var(--mk-subtle)]">
          So nobody books you in five minutes.
        </span>
      </label>

      <Button onClick={saveHours} disabled={busy || saving || rules.length === 0}>
        {busy || saving ? "Saving…" : "Save and continue"}
      </Button>
    </div>
  );
}
