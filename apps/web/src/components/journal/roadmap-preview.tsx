import { ROADMAP_STEPS } from "@/lib/journal/roadmap-steps";
import { LEARN_PATH, ROADMAP_COPY, ROADMAP_PREVIEW_STEPS } from "@/lib/learn";
import { ResourceSignupCta } from "@/components/journal/resource-signup-cta";

function StepCard({
  index,
  title,
  body,
  graduateWhen,
  numbered,
}: {
  index: number;
  title: string;
  body: string;
  graduateWhen: string[];
  numbered: boolean;
}) {
  return (
    <li className="relative pl-16">
      <span
        aria-hidden
        className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-full bg-[var(--brand-forest)] text-[16px] font-extrabold text-[var(--brand-paper-warm)]"
      >
        {index}
      </span>
      <h3 className="text-[18px] font-semibold leading-snug tracking-tight text-[var(--brand-ink)] md:text-[19px]">
        {title}
      </h3>
      <p className="mt-1.5 text-[15.5px] leading-relaxed text-[var(--brand-ink-muted)]">
        {body}
      </p>
      <div className="mt-3 rounded-xl bg-[#e8ecdd] px-4 py-3.5">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[var(--brand-forest)]">
          GRADUATE WHEN
        </p>
        {numbered ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] leading-relaxed text-[var(--brand-forest)]">
            {graduateWhen.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        ) : (
          <ul className="mt-2 space-y-1 text-[14px] leading-relaxed text-[var(--brand-forest)]">
            {graduateWhen.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/** First three steps in the clear. The rest is the reason to make an account. */
export function RoadmapPreview() {
  const open = ROADMAP_STEPS.slice(0, ROADMAP_PREVIEW_STEPS);
  const gated = ROADMAP_STEPS.slice(ROADMAP_PREVIEW_STEPS);

  return (
    <div className="mx-auto max-w-[680px]">
      <p className="text-[12px] font-semibold tracking-[0.16em] text-[var(--brand-forest)]">
        {ROADMAP_COPY.kicker}
      </p>
      <h1
        className="mt-3 text-balance text-[var(--brand-ink)]"
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: "clamp(2.15rem, 5vw, 3.5rem)",
          fontWeight: 470,
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
        }}
      >
        {ROADMAP_COPY.title}
      </h1>
      <div className="mt-4 max-w-[52ch] space-y-4 text-[16px] leading-relaxed text-[var(--brand-ink-muted)] md:text-[18px]">
        {ROADMAP_COPY.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <ol className="mt-10 space-y-10">
        {open.map((step, i) => (
          <StepCard
            key={step.title}
            index={i + 1}
            title={step.title}
            body={step.body}
            graduateWhen={step.graduateWhen}
            numbered={step.numbered}
          />
        ))}
      </ol>

      <div className="relative mt-10">
        <ol
          aria-hidden
          className="pointer-events-none select-none space-y-10 blur-[6px]"
        >
          {gated.map((step, i) => (
            <StepCard
              key={step.title}
              index={ROADMAP_PREVIEW_STEPS + i + 1}
              title={step.title}
              body={step.body}
              graduateWhen={step.graduateWhen}
              numbered={step.numbered}
            />
          ))}
        </ol>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--brand-paper-warm)]/20 via-[var(--brand-paper-warm)]/80 to-[var(--brand-paper-warm)]"
        />
        <div className="absolute inset-x-0 top-[18%] z-10 md:top-[14%]">
          <ResourceSignupCta
            kicker="SAVE YOUR PROGRESS"
            heading="Create a free account to build and save your personal Private Chef Roadmap."
            body="The first three steps are yours. Sign up to see the rest, check them off, and keep your place."
            next={`${LEARN_PATH}?focus=roadmap`}
            submitLabel="Create a free account"
          />
        </div>
      </div>
    </div>
  );
}
