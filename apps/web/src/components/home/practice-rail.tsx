import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ScrollRail } from '@/components/mentorship/scroll-rail';

const SCENARIOS = [
  {
    slug: 'banquet-captain',
    title: 'Banquet Captain interview',
    company: 'Convention center service',
    count: '1,240+',
    recommended: true,
  },
  {
    slug: 'private-chef',
    title: 'Private chef portfolio walkthrough',
    company: 'Residential & yacht kitchens',
    count: '890+',
  },
  {
    slug: 'sous-chef',
    title: 'Sous Chef leadership screen',
    company: 'Fine dining brigade',
    count: '2,100+',
  },
  {
    slug: 'events-director',
    title: 'Events Director case interview',
    company: 'Hotel & catering groups',
    count: '640+',
  },
  {
    slug: 'pastry-lead',
    title: 'Pastry Lead tasting interview',
    company: 'Hotel pastry programs',
    count: '410+',
  },
] as const;

/** ADPList "Practice the interview…" band — Brigade kitchen scenarios. */
export function PracticeRail() {
  return (
    <section className="mk-shell py-10">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="mk-rail-title">Practice the interview before the big day</h2>
        <Link
          href="/mentors"
          className="shrink-0 text-[14px] font-medium text-[var(--mk-muted)] hover:text-[var(--mk-text)]"
        >
          Show all
        </Link>
      </div>
      <p className="mb-6 max-w-prose text-[15px] leading-relaxed text-[var(--mk-muted)]">
        Run a realistic mock for the exact hospitality role you want. Get specific feedback
        the second you finish. Repeat until you walk in ready.
      </p>

      <ScrollRail>
        {SCENARIOS.map((s) => (
          <Link
            key={s.slug}
            href={`/mentors?q=${encodeURIComponent(s.title)}`}
            className="group flex w-[248px] shrink-0 flex-col rounded-2xl border border-[var(--mk-line)] p-5 transition hover:shadow-[var(--mk-shadow-lift)]"
          >
            {"recommended" in s && s.recommended ? (
              <span className="mk-badge mk-badge-purple mb-3 self-start">Recommended</span>
            ) : null}
            <p className="text-[16px] font-semibold leading-snug text-[var(--mk-text)]">{s.title}</p>
            <p className="mt-1 text-[14px] text-[var(--mk-muted)]">{s.company}</p>
            <p className="mt-4 text-[13px] text-[var(--mk-subtle)]">
              Join {s.count} practicing
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--mk-text)]">
              Practice
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </ScrollRail>

      <div className="mt-5">
        <Link href="/mentors" className="mk-btn mk-btn-outline h-10 px-5">
          Show all
        </Link>
      </div>
    </section>
  );
}
