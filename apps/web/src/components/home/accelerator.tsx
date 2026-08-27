import { ApplyButton } from "@/components/home/apply-button";
import {
  ACCELERATOR_COACHES,
  ACCELERATOR_INCLUDES,
  ACCELERATOR_NAME,
  ACCELERATOR_WEEKS,
} from "@/lib/accelerator";

export function AcceleratorSection() {
  return (
    <section
      id="accelerator"
      className="relative scroll-mt-[88px] bg-[var(--brand-cream)] py-20 md:scroll-mt-[100px] md:py-28"
    >
      <div className="mk-shell">
        <div className="mx-auto max-w-[820px] text-center">
          <p className="text-[12px] font-semibold tracking-[0.16em] text-[var(--brand-forest)]">
            THE COHORT
          </p>
          <h2
            className="mt-3 text-balance text-[var(--brand-ink)]"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "clamp(2.15rem, 5vw, 3.5rem)",
              fontWeight: 470,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            {ACCELERATOR_NAME}
          </h2>
          <p className="mx-auto mt-4 max-w-[42ch] text-[16px] leading-relaxed text-[var(--brand-ink-muted)] md:text-[18px]">
            Eight weeks with working private chefs. Curriculum, coaching, and
            accountability so you actually make the move. First cohort is small
            on purpose.
          </p>
          <span
            aria-hidden
            className="mx-auto mt-8 block h-px w-16 bg-[var(--brand-gold)]"
          />
        </div>

        <ol className="mx-auto mt-12 grid max-w-[960px] grid-cols-1 gap-3 sm:grid-cols-2">
          {ACCELERATOR_WEEKS.map((week) => (
            <li
              key={week.week}
              className="rounded-2xl bg-[var(--brand-paper-warm)] px-5 py-5 md:px-6"
            >
              <p className="text-[12px] font-semibold tracking-[0.14em] text-[var(--brand-forest)]">
                WEEK {week.week}
              </p>
              <h3 className="mt-1.5 text-[18px] font-semibold tracking-tight text-[var(--brand-ink)] md:text-[20px]">
                {week.title}
              </h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--brand-ink-muted)]">
                {week.detail}
              </p>
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-14 max-w-[960px]">
          <h3 className="text-center text-[12px] font-semibold tracking-[0.16em] text-[var(--brand-forest)]">
            THE COACHES
          </h3>
          <p className="mx-auto mt-3 max-w-[40ch] text-center text-[16px] leading-relaxed text-[var(--brand-ink-muted)]">
            Specialists inside the private-chef transition. Each one is there to
            get you paying clients.
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ACCELERATOR_COACHES.map((coach) => (
              <li
                key={coach.role}
                className="rounded-2xl bg-[var(--brand-paper-warm)] px-5 py-5 md:px-6"
              >
                <h4 className="text-[18px] font-semibold tracking-tight text-[var(--brand-ink)]">
                  {coach.role}
                </h4>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--brand-ink-muted)]">
                  {coach.does}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <ul className="mx-auto mt-12 max-w-[640px] space-y-2 text-[15px] text-[var(--brand-ink-muted)]">
          {ACCELERATOR_INCLUDES.map((item) => (
            <li key={item} className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--brand-forest)]"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center">
          <ApplyButton />
        </div>
      </div>
    </section>
  );
}
