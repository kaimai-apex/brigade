'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EXPLORE_SECTIONS } from '@/lib/explore';
import { cn } from '@/lib/utils';

/** Sticky sub-nav across the seven Explore sub-sections. */
export function ExploreSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 mb-8 overflow-x-auto border-b border-neutral-200 px-4">
      <ul className="flex min-w-max items-center gap-1 pb-px">
        <li>
          <Link
            href="/explore"
            className={cn(
              'inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition',
              pathname === '/explore'
                ? 'border-rust text-ink'
                : 'border-transparent text-ink/55 hover:text-ink',
            )}
          >
            Overview
          </Link>
        </li>
        {EXPLORE_SECTIONS.map((s) => {
          const active = pathname.startsWith(s.href);
          return (
            <li key={s.slug}>
              <Link
                href={s.href}
                className={cn(
                  'inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition',
                  active
                    ? 'border-rust text-ink'
                    : 'border-transparent text-ink/55 hover:text-ink',
                )}
              >
                <span aria-hidden>{s.emoji}</span>
                {s.title.replace('Featured ', '')}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
