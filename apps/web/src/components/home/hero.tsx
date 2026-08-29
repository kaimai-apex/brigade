import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RoleDeck } from '@/components/landing/role-deck';
import { HeroScrollHint } from '@/components/home/hero-scroll-hint';
import { ApplyButton } from '@/components/home/apply-button';
import { learnSignupHref } from '@/lib/learn';
import { POSITIONING } from '@/lib/accelerator';

/**
 * Landing hero. Primary action is the Accelerator. Free guides are the on-ramp.
 */
export function HomeHero() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden bg-[var(--brand-paper-warm)] pb-16 pt-[92px] md:pb-28 md:pt-[108px] lg:min-h-[100svh]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="art-blob blob-cobalt opacity-90" />
        <span className="art-blob blob-forest opacity-90" />
        <span className="art-blob blob-gold opacity-90" />
        <span className="art-blob blob-rust opacity-90" />
      </div>

      <div className="relative z-10 w-full max-w-[900px] px-5 text-center">
        <h1 className="mk-serif-display text-balance text-[var(--brand-ink)]">
          Build Your Next Chapter as a Private Chef
        </h1>

        <p className="mx-auto mt-4 max-w-[34ch] text-[16px] leading-relaxed text-[var(--brand-ink-muted)] md:mt-6 md:max-w-[640px] md:text-[19px]">
          {POSITIONING} Start with the{" "}
          <Link
            href={learnSignupHref()}
            className="underline decoration-[var(--brand-ink)]/25 underline-offset-4 hover:decoration-[var(--brand-ink)]"
          >
            free guides
          </Link>
          . When you are ready to do the work, join the cohort.
        </p>

        <div className="mx-auto mt-7 flex w-full max-w-[22rem] flex-col items-stretch gap-2.5 sm:mt-10 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
          <ApplyButton>Join The Next Brigade Cohort</ApplyButton>
          <Link
            href={learnSignupHref()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-[var(--brand-ink)] shadow-[inset_0_0_0_1px_rgba(26,26,23,0.18)] transition hover:bg-black/5 sm:w-auto"
          >
            Read The Free Guides
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={learnSignupHref("roadmap")}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-[var(--brand-ink)] shadow-[inset_0_0_0_1px_rgba(26,26,23,0.18)] transition hover:bg-black/5 sm:w-auto"
          >
            Private Chef Roadmap
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="relative z-10 mt-8 w-full max-w-[640px] px-4 lg:mt-12">
        <RoleDeck />
      </div>

      <HeroScrollHint />
    </section>
  );
}
