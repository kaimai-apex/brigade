import Link from "next/link";
import { LADDER } from "@/lib/accelerator";

/** The three-beat story a visitor should be able to recite in 30 seconds. */
export function PathLadder() {
  return (
    <section className="bg-[var(--brand-paper-warm)] pb-6 pt-4 md:pb-8">
      <div className="mk-shell">
        <ol className="mx-auto grid max-w-[960px] grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
          {LADDER.map((step, i) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="block rounded-2xl bg-[var(--brand-cream)] px-5 py-6 transition hover:brightness-[0.98] md:px-6 md:py-7"
              >
                <p className="text-[12px] font-semibold tracking-[0.16em] text-[var(--brand-forest)]">
                  {String(i + 1).padStart(2, "0")} · {step.product.toUpperCase()}
                </p>
                <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-[var(--brand-ink)] md:text-[32px]">
                  {step.label}
                </h2>
                <p className="mt-2 text-[16px] leading-relaxed text-[var(--brand-ink-muted)]">
                  {step.promise}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
