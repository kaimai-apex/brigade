'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ClipboardList, Rocket, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  {
    href: '/learn',
    label: 'Learn',
    icon: BookOpen,
    match: (p: string) =>
      p.startsWith('/learn') || p.startsWith('/journal') || p === '/roadmap',
  },
  {
    href: '/accelerator',
    label: 'Accelerator',
    icon: Rocket,
    match: (p: string) => p.startsWith('/accelerator'),
  },
  {
    href: '/apply',
    label: 'Apply',
    icon: ClipboardList,
    match: (p: string) => p === '/apply',
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
 * Same destinations as the top nav: Learn, Accelerator, Apply, Profile.
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
