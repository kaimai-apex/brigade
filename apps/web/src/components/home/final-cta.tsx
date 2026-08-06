import Link from 'next/link';

/** Closing ink band — clear next steps, no invented social proof. */
export function FinalCta() {
  return (
    <section className="bg-[var(--mk-ink)] py-16 text-center text-[var(--brand-white)] md:py-20">
      <div className="mk-shell">
        <h2 className="mx-auto max-w-[18ch] text-balance text-[32px] font-semibold leading-tight md:text-[44px]">
          Ready when you are
        </h2>
        <p className="mx-auto mt-5 max-w-[40ch] text-[16px] text-[var(--brand-white)]/75">
          Pick a skill. Find a private chef who teaches it. Book the session.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/mentors"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--mk-surface)] px-6 text-sm font-semibold text-[var(--mk-ink)] hover:bg-[var(--mk-surface)]/90"
          >
            Find a mentor
          </Link>
          <Link
            href="/login?next=/mentorship/setup"
            className="inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold text-[var(--brand-white)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)] hover:bg-[var(--mk-surface)]/10"
          >
            Become a mentor
          </Link>
        </div>
      </div>
    </section>
  );
}
