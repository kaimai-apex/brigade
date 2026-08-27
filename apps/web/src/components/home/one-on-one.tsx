import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * 1:1 sits above the cohort, not beside it. Homepage visitors should not
 * land in a mentor marketplace before they understand the flagship product.
 */
export function OneOnOneSection() {
  return (
    <section className="bg-[var(--brand-paper-warm)] py-16 md:py-20">
      <div className="mk-shell">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[var(--brand-forest)]">
            1:1
          </p>
          <h2
            className="mt-3 text-balance text-[var(--brand-ink)]"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "clamp(1.85rem, 4vw, 2.75rem)",
              fontWeight: 470,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            1:1 when your situation needs a chef in the room.
          </h2>
          <p className="mx-auto mt-4 max-w-[40ch] text-[16px] leading-relaxed text-[var(--brand-ink-muted)] md:text-[18px]">
            Pricing a weird household. A contract you have never seen. A client
            who wants something you have not cooked yet. Book a working private
            chef for that problem.
          </p>
          <Link
            href="/mentors"
            className="mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--brand-ink)] transition hover:text-[var(--brand-forest)]"
          >
            Browse 1:1 coaches
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
