"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * One-time welcome after passwordless signup.
 *
 * Triggered by `?welcome=1` on the landing page after verify. Dismissible;
 * clears the query param so a refresh does not bring it back.
 */
export function WelcomeBanner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(searchParams.get("welcome") === "1");
  }, [searchParams]);

  function dismiss() {
    setVisible(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (!visible) return null;

  return (
    <div
      className="relative overflow-hidden border-b border-[var(--brand-hairline)] bg-[var(--brand-paper-warm)]"
      role="status"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 120% at 0% 0%, var(--brand-sage-pale), transparent 55%), radial-gradient(ellipse 60% 100% at 100% 100%, rgba(232,184,75,0.22), transparent 50%)",
        }}
      />
      <div className="relative mx-auto flex max-w-[1320px] items-start gap-4 px-5 py-4 md:items-center md:px-8">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold tracking-tight text-[var(--brand-ink)] md:text-xl">
            New account created
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--brand-ink-muted)] md:text-[15px]">
            Welcome to Brigade — you&apos;re in. Finish a short profile when you&apos;re
            ready, or start browsing mentors anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--brand-ink)]/70 transition hover:bg-black/5 hover:text-[var(--brand-ink)]"
          aria-label="Dismiss welcome message"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
