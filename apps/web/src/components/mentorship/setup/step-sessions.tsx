"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoney, splitPrice, MAX_PRICE_CENTS } from "@/lib/mentorship/pricing";
import type { StepProps, SetupSessionType } from "./types";

/**
 * What you sell, and what it costs.
 *
 * Every price is shown alongside what the mentor actually keeps. A marketplace
 * that only shows the headline number and reveals its cut on the payout
 * statement has picked a fight it will lose later, so the 20% is stated on
 * every row, while they are choosing the number.
 */

const STARTERS = [
  { title: "Intro chat", durationMinutes: 30, priceCents: 0, description: "A first conversation — see if we click." },
  { title: "Menu & costing 1:1", durationMinutes: 60, priceCents: 15000, description: "Bring a menu, leave with margins." },
  { title: "Deep dive", durationMinutes: 90, priceCents: 25000, description: "A working session on one real problem." },
];

/** Currency units in, integer minor units out. Never a float past this point. */
function toCents(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function toUnits(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

export function StepSessions({ state, reload, onNext }: StepProps) {
  const currency = state.mentor?.currency ?? "usd";
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const active = state.sessionTypes.filter((type) => type.active);

  async function create(input: {
    title: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
  }) {
    setBusy(true);
    try {
      const res = await fetch("/api/mentorship/me/session-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Could not add the session");
        return false;
      }
      await reload();
      toast.success("Session added");
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/mentorship/me/session-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Could not save");
        return false;
      }
      await reload();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function retire(id: string) {
    if (!window.confirm("Stop offering this session? Sessions already booked are unaffected.")) {
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/mentorship/me/session-types/${id}`, { method: "DELETE" });
      await reload();
      toast.success("Session retired");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-semibold text-[var(--mk-text)]">Set your prices</h2>
        <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
          You decide what each session is and what it costs. Brigade takes 20% of a paid
          booking; the rest is yours. A free session is allowed — plenty of mentors start
          with a short intro call.
        </p>
      </div>

      {active.length > 0 && (
        <ul className="space-y-3">
          {active.map((type) =>
            editing === type.id ? (
              <li key={type.id} className="rounded-xl border border-[var(--mk-line)] p-4">
                <SessionForm
                  initial={type}
                  currency={currency}
                  busy={busy}
                  submitLabel="Save changes"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (values) => {
                    const ok = await update(type.id, values);
                    if (ok) {
                      setEditing(null);
                      toast.success("Session updated");
                    }
                  }}
                />
              </li>
            ) : (
              <li
                key={type.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--mk-line)] p-4"
              >
                <div className="min-w-0">
                  <p className="text-[16px] font-medium text-[var(--mk-text)]">{type.title}</p>
                  <p className="text-[13px] text-[var(--mk-subtle)]">
                    {type.durationMinutes} minutes
                  </p>
                  {type.description && (
                    <p className="mt-1 text-[14px] text-[var(--mk-muted)]">{type.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-semibold text-[var(--mk-text)]">
                    {type.priceCents === 0 ? "Free" : formatMoney(type.priceCents, currency)}
                  </p>
                  {type.priceCents > 0 && (
                    <p className="text-[13px] text-[var(--mk-subtle)]">
                      you keep{" "}
                      {formatMoney(splitPrice(type.priceCents).mentorPayoutCents, currency)}
                    </p>
                  )}
                  <div className="mt-2 flex justify-end gap-3 text-[13px]">
                    <button
                      type="button"
                      onClick={() => setEditing(type.id)}
                      className="text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => retire(type.id)}
                      className="text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
                    >
                      Retire
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {active.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--mk-line)] p-4">
          <p className="text-[14px] font-medium text-[var(--mk-text)]">Start from one of these</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter.title}
                type="button"
                disabled={busy}
                onClick={() => create(starter)}
                className="rounded-full px-3 py-1.5 text-[13px] text-[var(--mk-text)] shadow-[inset_0_0_0_1px_var(--mk-chip-line)] hover:bg-[var(--mk-wash)] disabled:opacity-50"
              >
                {starter.title} ·{" "}
                {starter.priceCents === 0
                  ? "Free"
                  : formatMoney(starter.priceCents, currency)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-[var(--mk-subtle)]">
            You can change the title, length and price afterwards.
          </p>
        </div>
      )}

      <details className="rounded-xl border border-[var(--mk-line)] p-4">
        <summary className="cursor-pointer text-[14px] font-medium text-[var(--mk-text)]">
          Add a session
        </summary>
        <div className="mt-4">
          <SessionForm
            currency={currency}
            busy={busy}
            submitLabel="Add session"
            onSubmit={async (values) => {
              await create({
                title: values.title,
                description: values.description ?? "",
                durationMinutes: values.durationMinutes,
                priceCents: values.priceCents,
              });
            }}
          />
        </div>
      </details>

      <div className="flex items-center gap-3">
        <Button onClick={onNext} disabled={active.length === 0}>
          Continue
        </Button>
        {active.length === 0 && (
          <span className="text-[13px] text-[var(--mk-subtle)]">
            Add at least one session to carry on.
          </span>
        )}
      </div>
    </div>
  );
}

function SessionForm({
  initial,
  currency,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: SetupSessionType;
  currency: string;
  busy: boolean;
  submitLabel: string;
  onSubmit: (values: {
    title: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
  }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? 60));
  const [price, setPrice] = useState(toUnits(initial?.priceCents ?? 15000));

  const cents = toCents(price);
  const split = cents === null ? null : splitPrice(cents);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (cents === null) {
          toast.error("Enter a price");
          return;
        }
        if (cents > MAX_PRICE_CENTS) {
          toast.error(`The most a session can cost is ${formatMoney(MAX_PRICE_CENTS, currency)}`);
          return;
        }
        await onSubmit({
          title,
          description: description.trim() || null,
          durationMinutes: Number(duration),
          priceCents: cents,
        });
      }}
    >
      <label className="block sm:col-span-2">
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={100}
          placeholder="Menu & costing 1:1"
          className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
        />
      </label>

      <label className="block sm:col-span-2">
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">Description</span>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={280}
          placeholder="What they should bring, what they leave with"
          className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
        />
      </label>

      <label className="block">
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">Minutes</span>
        <select
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
        >
          {[15, 30, 45, 60, 90, 120].map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[13px] font-semibold text-[var(--mk-text)]">
          Price ({currency.toUpperCase()})
        </span>
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          type="number"
          min={0}
          step="1"
          inputMode="decimal"
          className="mt-1 h-12 w-full rounded-lg border border-[var(--mk-line)] px-3 text-base"
        />
      </label>

      <p className="text-[13px] text-[var(--mk-subtle)] sm:col-span-2">
        {split === null
          ? "Enter a price."
          : split.priceCents === 0
            ? "Free — nothing is charged, and nothing is deducted."
            : `They pay ${formatMoney(split.priceCents, currency)} · Brigade keeps ${formatMoney(
                split.platformFeeCents,
                currency,
              )} · you receive ${formatMoney(split.mentorPayoutCents, currency)}.`}
      </p>

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" variant="outline" disabled={busy || !title.trim()}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
