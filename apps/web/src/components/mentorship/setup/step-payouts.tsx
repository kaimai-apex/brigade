"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoney, splitPrice } from "@/lib/mentorship/pricing";
import type { StepProps } from "./types";

interface PayoutStatus {
  configured: boolean;
  connected: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
  bankPayoutsEnabled?: boolean;
  requirementsDue: string[];
}

/**
 * Connecting a payout account.
 *
 * Brigade never touches a bank account or an identity document — Stripe Connect
 * owns all of it, which is also why the mentor leaves the site to do this. The
 * only thing this step does is start Stripe's hosted flow and then ask Stripe
 * what the answer was.
 *
 * The state is always read back from Stripe rather than assumed from the mentor
 * returning: coming back means they closed the form, not that they were approved.
 */
export function StepPayouts({ state, reload, onNext }: StepProps) {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const currency = state.mentor?.currency ?? "usd";
  const paidSessions = state.sessionTypes.filter((type) => type.active && type.priceCents > 0);
  const cheapest = paidSessions.length
    ? Math.min(...paidSessions.map((type) => type.priceCents))
    : null;

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/mentorship/me/payouts", { cache: "no-store" });
      if (!res.ok) return;
      setStatus((await res.json()) as PayoutStatus);
    } catch {
      // Leave the previous answer on screen rather than flashing an error.
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  // Coming back from Stripe's hosted form: re-read, then drop the marker so a
  // refresh does not look like a fresh return.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("payouts")) return;
    void (async () => {
      await check();
      await reload();
      const url = new URL(window.location.href);
      url.searchParams.delete("payouts");
      window.history.replaceState({}, "", url.toString());
    })();
  }, [check, reload]);

  async function connect() {
    setBusy(true);
    try {
      const res = await fetch("/api/mentorship/me/payouts", { method: "POST" });
      const json = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !json.url) {
        toast.error(json.message ?? "Could not start payout setup");
        return;
      }
      // Stripe's own onboarding, not part of this app.
      window.location.assign(json.url);
    } finally {
      setBusy(false);
    }
  }

  // No Stripe on this deployment at all: say so plainly rather than showing a
  // button that cannot work.
  if (status && !status.configured) {
    return (
      <div className="space-y-6">
        <Heading />
        <div className="rounded-xl border border-[var(--mk-line)] bg-[var(--mk-warn-bg)] p-4">
          <p className="text-[14px] font-medium text-[var(--mk-text)]">
            Payments are not switched on for this deployment yet.
          </p>
          <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
            You can still publish and take bookings — you will arrange payment with the
            other person directly until Stripe is connected.
          </p>
        </div>
        <Button onClick={onNext}>Continue</Button>
      </div>
    );
  }

  const enabled = status?.payoutsEnabled ?? false;

  return (
    <div className="space-y-6">
      <Heading />

      {cheapest !== null && (
        <div className="rounded-xl border border-[var(--mk-line)] p-4">
          <p className="text-[14px] text-[var(--mk-muted)]">
            On your cheapest paid session, {formatMoney(cheapest, currency)}, you receive{" "}
            <strong className="font-semibold text-[var(--mk-text)]">
              {formatMoney(splitPrice(cheapest).mentorPayoutCents, currency)}
            </strong>{" "}
            and Brigade keeps {formatMoney(splitPrice(cheapest).platformFeeCents, currency)}.
          </p>
        </div>
      )}

      {enabled ? (
        <div className="rounded-xl border border-[var(--mk-line)] bg-[var(--mk-badge-green-bg)] p-4">
          <p className="text-[14px] font-medium text-[var(--mk-badge-green-text)]">
            Stripe is connected. You can take paid bookings.
          </p>
          {status?.bankPayoutsEnabled === false && (
            <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
              Stripe is still verifying your bank details, so money will be held until that
              finishes. Bookings work in the meantime.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Button onClick={connect} disabled={busy}>
            {busy
              ? "Opening Stripe…"
              : status?.connected
                ? "Finish setting up payouts"
                : "Connect Stripe"}
          </Button>

          {status?.connected && !enabled && (
            <div className="rounded-xl border border-[var(--mk-line)] bg-[var(--mk-warn-bg)] p-4">
              <p className="text-[14px] text-[var(--mk-text)]">
                {status.detailsSubmitted
                  ? "Stripe has your details and is still reviewing them. This is usually quick."
                  : "You started setting up payouts but did not finish."}
              </p>
              {status.requirementsDue.length > 0 && (
                <p className="mt-1 text-[13px] text-[var(--mk-muted)]">
                  Stripe still needs: {status.requirementsDue.join(", ")}.
                </p>
              )}
              <button
                type="button"
                onClick={check}
                className="mt-2 text-[13px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
              >
                Check again
              </button>
            </div>
          )}

          <p className="text-[13px] text-[var(--mk-subtle)]">
            Stripe collects your bank details and verifies who you are. Brigade never sees
            them.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onNext} variant={enabled ? "default" : "outline"}>
          Continue
        </Button>
        {!enabled && paidSessions.length > 0 && (
          <span className="text-[13px] text-[var(--mk-subtle)]">
            You can carry on, but paid sessions cannot go live until this is connected.
          </span>
        )}
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div>
      <h2 className="text-[20px] font-semibold text-[var(--mk-text)]">Get paid</h2>
      <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
        Money from a booking goes to your own Stripe account, minus Brigade&rsquo;s 20%.
        Stripe holds the bank details and does the identity checks.
      </p>
    </div>
  );
}
