"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMoney, refundForCancellation } from "@/lib/mentorship/pricing";

/**
 * Waiting for the webhook.
 *
 * Stripe redirects the payer to the success URL the moment the card clears,
 * which is BEFORE the webhook that confirms the booking has necessarily
 * arrived. Claiming "confirmed" on arrival would be a guess, and a wrong one
 * whenever the webhook is slow or fails. So the page says what is actually
 * true — the payment went through, the confirmation is landing — and polls
 * until the status changes.
 */
export function AwaitingConfirmation({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [waitedSeconds, setWaited] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    const timer = setInterval(async () => {
      if (cancelled) return;
      const elapsed = Math.round((Date.now() - started) / 1000);
      setWaited(elapsed);

      // Give up polling after a minute. Something is wrong that refreshing
      // will not fix, and a page that spins forever tells the user nothing.
      if (elapsed > 60) {
        clearInterval(timer);
        return;
      }

      try {
        const res = await fetch(`/api/mentorship/bookings/${bookingId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { status?: string };
        if (json.status === "confirmed") {
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // Transient — the next tick tries again.
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [bookingId, router]);

  return (
    <div className="rounded-xl border border-[var(--mk-line)] bg-[var(--mk-wash)] p-4">
      <p className="text-[15px] font-medium text-[var(--mk-text)]">
        Payment received — confirming your session…
      </p>
      <p className="mt-1 text-[14px] text-[var(--mk-muted)]">
        {waitedSeconds > 60
          ? "This is taking longer than it should. Your payment went through; refresh in a minute, and contact us if it still has not appeared."
          : "This usually takes a couple of seconds."}
      </p>
    </div>
  );
}

/**
 * Cancel, with the refund stated before the click rather than after.
 *
 * The amount is computed from the same function the server uses to issue the
 * refund, so the number in the confirmation prompt is the number that will
 * actually come back.
 */
export function CancelSessionButton({
  bookingId,
  priceCents,
  refundedCents,
  currency,
  startsAt,
  viewerIsMentor,
}: {
  bookingId: string;
  priceCents: number;
  refundedCents: number;
  currency: string;
  startsAt: string;
  viewerIsMentor: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    const decision = refundForCancellation({
      priceCents,
      refundedCents,
      startsAt: new Date(startsAt),
      now: new Date(),
      cancelledBy: viewerIsMentor ? "mentor" : "mentee",
    });

    const summary =
      priceCents === 0
        ? "Cancel this session?"
        : `${decision.reason}\n\n${
            decision.refundCents > 0
              ? `You will be refunded ${formatMoney(decision.refundCents, currency)}.`
              : "No refund will be issued."
          }\n\nCancel this session?`;

    if (!window.confirm(summary)) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/mentorship/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const json = (await res.json()) as { message?: string; refundedCents?: number };
      if (!res.ok) {
        toast.error(json.message ?? "Could not cancel");
        return;
      }
      toast.success(
        json.refundedCents
          ? `Cancelled — ${formatMoney(json.refundedCents, currency)} refunded`
          : "Session cancelled",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={cancel}
      disabled={busy}
      className="text-[14px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)] disabled:opacity-50"
    >
      {busy ? "Cancelling…" : "Cancel this session"}
    </button>
  );
}

/** Copy the meeting link without leaving the receipt. */
export function CopyLinkButton({ url }: { url: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Meeting link copied");
        } catch {
          toast.error("Could not copy — select the link and copy it manually");
        }
      }}
      className="text-[14px] text-[var(--mk-muted)] underline underline-offset-4 hover:text-[var(--mk-text)]"
    >
      Copy link
    </button>
  );
}
