import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RoleDeck } from '@/components/landing/role-deck';

/**
 * Landing hero — one clear CTA into the mentor directory.
 */
export function HomeHero() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden bg-[var(--brand-paper-warm)] pb-14 pt-[100px] md:pb-16 md:pt-[108px] lg:min-h-[88vh]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="art-blob blob-cobalt opacity-90" />
        <span className="art-blob blob-forest opacity-90" />
        <span className="art-blob blob-gold opacity-90" />
        <span className="art-blob blob-rust opacity-90" />
      </div>

      <div className="relative z-10 w-full max-w-[900px] px-5 text-center">
        <h1 className="mk-serif-display text-balance text-[var(--brand-ink)]">
          The fastest way to get unstuck in hospitality
        </h1>

        <p className="mx-auto mt-5 max-w-[36ch] text-[17px] leading-relaxed text-[var(--brand-ink-muted)] md:mt-6 md:max-w-[640px] md:text-[19px]">
          Meet a private chef who already made the move you want to make. Book a
          1:1 session and leave with a plan.
        </p>

        <div className="mx-auto mt-8 flex justify-center sm:mt-10">
          <Link
            href="/mentors"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--mk-ink)] px-6 text-[15px] font-semibold text-[var(--brand-white)] transition hover:scale-[1.02]"
          >
            Browse mentors
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="relative z-10 mt-10 w-full max-w-[640px] px-4 lg:mt-12">
        <RoleDeck />
      </div>
    </section>
  );
}
