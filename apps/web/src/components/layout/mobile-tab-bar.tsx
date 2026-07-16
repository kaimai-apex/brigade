'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, MessageSquare, Newspaper, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  {
    href: '/feed',
    label: 'Feed',
    icon: Newspaper,
    match: (p: string) => p === '/feed' || p.startsWith('/posts'),
  },
  {
    href: '/brigade',
    label: 'Brigade',
    icon: Users,
    match: (p: string) => p.startsWith('/brigade') || p.startsWith('/network'),
  },
  {
    href: '/discover',
    label: 'Discover',
    icon: Compass,
    match: (p: string) => p.startsWith('/discover'),
  },
  {
    href: '/messages',
    label: 'Messages',
    icon: MessageSquare,
    match: (p: string) => p.startsWith('/messages'),
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
 * Top nav keeps search/alerts/account; primary destinations live here.
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
                active ? 'text-ink' : 'text-neutral-500 active:text-ink',
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
