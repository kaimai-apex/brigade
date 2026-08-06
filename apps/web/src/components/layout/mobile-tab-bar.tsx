'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, Compass, GraduationCap, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  {
    href: '/mentors',
    label: 'Mentors',
    icon: GraduationCap,
    match: (p: string) => p.startsWith('/mentors'),
  },
  {
    href: '/directory',
    label: 'Directory',
    icon: Compass,
    match: (p: string) => p.startsWith('/directory'),
  },
  {
    href: '/sessions',
    label: 'Sessions',
    icon: CalendarCheck,
    match: (p: string) => p.startsWith('/sessions'),
  },
  {
    href: '/profile/me',
    label: 'Profile',
    icon: User,
    match: (p: string) => p.startsWith('/profile') || p.startsWith('/settings/profile'),
  },
] as const;

/**
 * Mobile-web-app bottom navigation (authenticated pages, < md only).
 * Top nav keeps search and account; primary destinations live here.
 *
 * Four tabs, down from five: Feed, Brigade and Messages went with the social
 * network, and Sessions replaced them because a booked call is the thing a
 * member actually comes back to check.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      data-mobile-tabbar
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-[480px]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition',
                active ? 'text-ink' : 'text-neutral-600 active:text-ink',
              )}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-10 rounded-full bg-ink" />
              )}
              <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} />
              <span className={cn(active && 'font-semibold')}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
