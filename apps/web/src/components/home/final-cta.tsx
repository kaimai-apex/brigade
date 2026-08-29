import { ApplyButton } from '@/components/home/apply-button';

/** Closing ink band. The cohort is the ask. */
export function FinalCta() {
  return (
    <section className="bg-[var(--mk-ink)] py-16 text-center text-[var(--brand-white)] md:py-20">
      <div className="mk-shell">
        <h2 className="mx-auto max-w-[18ch] text-balance text-[32px] font-semibold leading-tight md:text-[44px]">
          Ready to actually do this
        </h2>
        <p className="mx-auto mt-5 max-w-[40ch] text-[16px] text-[var(--brand-white)]/75">
          First cohort is small. Apply if you are a restaurant chef ready to
          build the private chef business.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <ApplyButton light />
        </div>
      </div>
    </section>
  );
}
