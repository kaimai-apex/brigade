import Link from 'next/link';

/** Closing ink band — ADPList FinalCta layout, Brigade copy. */
export function FinalCta() {
  return (
    <section className="bg-[var(--mk-ink)] py-20 text-center text-[var(--brand-white)]">
      <div className="mk-shell">
        <h2 className="mx-auto max-w-[18ch] text-balance text-[32px] font-semibold leading-tight md:text-[44px]">
          Join the ambitious people building hospitality careers
        </h2>
        <p className="mt-5 text-[16px] text-[var(--brand-white)]/70">
          Mentorship that starts in the kitchen. Takes a minute to join.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/mentors"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--mk-surface)] px-6 text-sm font-semibold text-[var(--mk-ink)] hover:bg-[var(--mk-surface)]/90"
          >
            Find your mentor
          </Link>
          <Link
            href="/waitlist"
            className="inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold text-[var(--brand-white)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)] hover:bg-[var(--mk-surface)]/10"
          >
            Get started today
          </Link>
        </div>
      </div>
    </section>
  );
}
