import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EXPLORE_SECTIONS } from '@/lib/explore';
import { Card } from '@/components/ui/card';

/** The seven Explore sub-sections as a discovery grid (MD §3). */
export function SectionGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {EXPLORE_SECTIONS.map((s) => (
        <li key={s.slug}>
          <Link href={s.href} className="group block h-full">
            <Card className="flex h-full flex-col p-5 transition group-hover:-translate-y-1 group-hover:border-neutral-300 group-hover:shadow-lg">
              <span className="text-3xl" aria-hidden>
                {s.emoji}
              </span>
              <h2 className="mt-3 font-display text-lg font-bold group-hover:text-forest">
                {s.title}
              </h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-ink/70">
                {s.tagline}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rust">
                Explore
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
