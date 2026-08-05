"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/mentorship/pricing";
import type { StepProps } from "./types";

/**
 * The last look before the card is public.
 *
 * The checklist here is the same `evaluateReadiness` result the server uses to
 * decide whether to accept `status: active`, so this cannot show a green tick
 * next to a button that then returns 400.
 */
export function StepReview({ state, save, saving, reload }: StepProps) {
  const [publishing, setPublishing] = useState(false);
  const readiness = state.readiness;
  const mentor = state.mentor;
  const active = state.sessionTypes.filter((type) => type.active);
  const currency = mentor?.currency ?? "usd";

  async function publish() {
    setPublishing(true);
    try {
      const ok = await save({ status: "active", onboardingStep: 6 });
      if (ok) toast.success("You are live in the mentor directory");
    } finally {
      setPublishing(false);
    }
  }

  async function pause() {
    setPublishing(true);
    try {
      const ok = await save({ status: "paused" });
      if (ok) toast.success("Bookings paused");
    } finally {
      setPublishing(false);
    }
  }

  const live = mentor?.status === "active";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-semibold text-[var(--mk-text)]">
          {live ? "You are live" : "Ready to go live"}
        </h2>
        <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
          {live
            ? "Your card is in the directory and people can book the hours you set."
            : "One last look. You can change any of this afterwards."}
        </p>
      </div>

      {readiness && (
        <ul className="space-y-2">
          {readiness.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-[var(--mk-line)] p-3"
            >
              <span
                aria-hidden
                className={
                  item.done
                    ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--mk-badge-green-bg)] text-[12px] text-[var(--mk-badge-green-text)]"
                    : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--mk-chip-line)] text-[12px] text-[var(--mk-subtle)]"
                }
              >
                {item.done ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] text-[var(--mk-text)]">
                  {item.label}
                  {!item.required && (
                    <span className="ml-2 text-[13px] text-[var(--mk-subtle)]">optional</span>
                  )}
                </span>
                {!item.done && (
                  <span className="mt-0.5 block text-[13px] text-[var(--mk-muted)]">
                    {item.hint}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {active.length > 0 && (
        <div className="rounded-xl border border-[var(--mk-line)] p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--mk-subtle)]">
            What people can book
          </p>
          <ul className="mt-2 space-y-1.5">
            {active.map((type) => (
              <li key={type.id} className="flex justify-between gap-4 text-[14px]">
                <span className="text-[var(--mk-text)]">
                  {type.title}{" "}
                  <span className="text-[var(--mk-subtle)]">· {type.durationMinutes} min</span>
                </span>
                <span className="font-medium text-[var(--mk-text)]">
                  {type.priceCents === 0 ? "Free" : formatMoney(type.priceCents, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {live ? (
          <>
            <Button asChild>
              <Link href={`/mentors/${mentor?.userId}`}>View your public page</Link>
            </Button>
            <Button variant="outline" onClick={pause} disabled={publishing || saving}>
              Pause bookings
            </Button>
          </>
        ) : (
          <Button
            onClick={publish}
            disabled={publishing || saving || !readiness?.canPublish}
            title={
              readiness?.canPublish
                ? undefined
                : `Still to do: ${readiness?.blocking.map((b) => b.label).join(", ")}`
            }
          >
            {publishing ? "Publishing…" : "Publish my card"}
          </Button>
        )}

        <button
          type="button"
          onClick={() => reload()}
          className="text-[14px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
        >
          Refresh
        </button>
      </div>

      {!readiness?.canPublish && readiness && (
        <p className="text-[13px] text-[var(--mk-subtle)]">
          Still to do: {readiness.blocking.map((item) => item.label.toLowerCase()).join(", ")}.
        </p>
      )}
    </div>
  );
}
