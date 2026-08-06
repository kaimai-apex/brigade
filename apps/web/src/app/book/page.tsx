"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BOOK_A_CALL } from "@/lib/book-a-call";
import { formatMoney } from "@/lib/mentorship/pricing";

function BookCallInner() {
  const search = useSearchParams();
  const cancelled = search.get("cancelled") === "1";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/book-call", { method: "POST" });
      const json = (await res.json()) as { checkoutUrl?: string; message?: string };
      if (!res.ok || !json.checkoutUrl) {
        setError(json.message ?? "Could not start checkout");
        return;
      }
      window.location.assign(json.checkoutUrl);
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--brand-paper-warm)] text-[var(--brand-ink)]">
      <header className="flex h-14 items-center border-b border-black/8 px-5">
        <Link href="/" className="font-display text-xl font-black tracking-tight">
          Brigade
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-ink-muted)]">
          Book a call
        </p>
        <h1 className="mt-3 text-balance text-[36px] font-semibold leading-tight md:text-[44px]">
          {BOOK_A_CALL.durationMinutes} minutes. One focused conversation.
        </h1>
        <p className="mx-auto mt-4 max-w-[36ch] text-[17px] leading-relaxed text-[var(--brand-ink-muted)]">
          Pay once, pick a time after checkout. We&apos;ll follow up by email to
          schedule.
        </p>

        <div className="mx-auto mt-10 rounded-2xl border border-black/10 bg-white p-8 text-left shadow-[0_12px_40px_rgba(16,24,40,0.08)]">
          <p className="text-[15px] font-semibold text-[var(--brand-ink)]">
            {BOOK_A_CALL.title}
          </p>
          <p className="mt-1 text-[28px] font-semibold tracking-tight">
            {formatMoney(BOOK_A_CALL.priceCents, BOOK_A_CALL.currency, "en-CA")}
          </p>
          <p className="mt-2 text-[14px] text-[var(--brand-ink-muted)]">
            One-time payment · CAD
          </p>

          {cancelled && (
            <p className="mt-4 rounded-lg bg-black/5 px-3 py-2 text-[14px] text-[var(--brand-ink-muted)]">
              Checkout was cancelled. You can try again whenever you&apos;re ready.
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-800">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout()}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--mk-ink)] text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Redirecting…" : "Book a call — pay with Stripe"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function BookCallPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center text-[var(--brand-ink-muted)]">
          Loading…
        </div>
      }
    >
      <BookCallInner />
    </Suspense>
  );
}
