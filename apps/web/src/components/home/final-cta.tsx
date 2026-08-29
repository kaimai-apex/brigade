import { ApplyButton } from '@/components/home/apply-button';

/** Closing ink band. The cohort is the ask. */
export function FinalCta() {
  return (
    <section className="bg-[var(--mk-ink)] py-12 text-center text-[var(--brand-white)] md:py-20">
      <div className="mk-shell">
        <h2 className="mx-auto max-w-[18ch] text-balance text-[28px] font-semibold leading-tight md:text-[44px]">
          Ready to actually do this
        </h2>
        <p className="mx-auto mt-4 max-w-[40ch] text-[16px] text-[var(--brand-white)]/75 md:mt-5">
          First cohort is small. Apply if you are a restaurant chef ready to
          build the private chef business.
        </p>
        <div className="mx-auto mt-8 flex max-w-[22rem] justify-center sm:mt-9 sm:max-w-none">
          <ApplyButton light />
        </div>
      </div>
    </section>
  );
}
