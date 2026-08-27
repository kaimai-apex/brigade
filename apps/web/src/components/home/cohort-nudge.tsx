import { ApplyButton } from "@/components/home/apply-button";

/** Free reading should end in a move, not another article. */
export function CohortNudge() {
  return (
    <div className="mt-14 rounded-2xl bg-[var(--brand-cream)] px-6 py-8 md:px-9 md:py-10">
      <p className="text-[12px] font-semibold tracking-[0.08em] text-[var(--brand-forest)]">
        NEXT
      </p>
      <h2 className="font-display mt-2 text-[24px] font-semibold tracking-tight md:text-[28px]">
        Ready to actually do this
      </h2>
      <p className="mt-2 max-w-[46ch] text-[16px] leading-relaxed text-[var(--brand-ink-muted)]">
        The guides tell you how private cheffing works. The Accelerator is eight
        weeks of doing the work with coaches and a small cohort.
      </p>
      <div className="mt-6">
        <ApplyButton />
      </div>
    </div>
  );
}
