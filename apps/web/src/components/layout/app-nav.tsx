'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  ChevronDown,
  Compass,
  LogOut,
  GraduationCap,
  Search,
  Settings,
  User,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { resolveAvatarUrl } from '@/lib/avatars';
import { cn, displayName, getInitials } from '@/lib/utils';

const NAV_ITEMS = [
  {
    href: '/mentors',
    label: 'Mentors',
    icon: GraduationCap,
    // /mentorship is the mentor's own admin page, not the browse, so it
    // deliberately does not light this tab.
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
] as const;

type AppNavProps = {
  user?: { firstName?: string; lastName?: string; avatarUrl?: string };
};

function AccountMenuItems({
  name,
  onLogout,
}: {
  name: string;
  onLogout: () => void;
}) {
  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/profile/me">
          <User className="size-4" /> View profile
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings/profile">
          <Settings className="size-4" /> Edit profile
        </Link>
      </DropdownMenuItem>
      {/* Teaching lives here rather than in the tab bar: most members are
          here to learn, and only the ones who mentor need the admin page. */}
      <DropdownMenuItem asChild>
        <Link href="/mentorship">
          <GraduationCap className="size-4" /> Your mentoring
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onLogout} className="text-rust focus:text-rust">
        <LogOut className="size-4" /> Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export function AppNav({ user }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();
  const name = user ? displayName(user.firstName, user.lastName) : 'Member';
  const initials = getInitials(user?.firstName, user?.lastName);
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl, session?.userId);
  const profileActive =
    pathname.startsWith('/profile') || pathname.startsWith('/settings/profile');

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      if (y < 48) {
        setCollapsed(false);
      } else if (y > lastY + 8) {
        setCollapsed(true);
      } else if (y < lastY - 8) {
        setCollapsed(false);
      }
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function goDiscover() {
    router.push('/directory');
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-neutral-200 bg-white transition-transform duration-200',
        collapsed && '-translate-y-full md:translate-y-0',
      )}
    >
      <div className="mx-auto flex h-12 max-w-[1128px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link
          href="/mentors"
          className="flex min-h-11 shrink-0 items-center font-display text-xl font-black tracking-tight text-ink"
        >
          Brigade
        </Link>

        <div className="hidden min-w-0 flex-1 sm:block sm:max-w-[220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
            <Input
              readOnly
              placeholder="Search members"
              className="h-9 rounded-md border-neutral-300 bg-neutral-50 pl-9 text-sm"
              onFocus={goDiscover}
              onClick={goDiscover}
            />
          </div>
        </div>

        <nav className="ml-auto hidden items-stretch md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex min-h-[44px] min-w-[52px] flex-col items-center justify-center gap-0.5 px-1.5 text-[11px] font-medium transition sm:min-w-[64px] sm:px-2',
                  active ? 'text-ink' : 'text-neutral-600 hover:text-ink',
                )}
              >
                <span className="relative flex h-6 items-center justify-center">
                  <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                </span>
                <span className={cn('hidden lg:block', active && 'font-semibold')}>
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-ink" />
                )}
              </Link>
            );
          })}

          {session && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'relative flex min-h-[44px] min-w-[52px] flex-col items-center justify-center gap-0.5 px-1.5 text-[11px] font-medium sm:min-w-[64px] sm:px-2',
                    profileActive ? 'text-ink' : 'text-neutral-600 hover:text-ink',
                  )}
                >
                  <Avatar className="size-6 border border-neutral-200">
                    <AvatarImage src={avatarSrc} alt={name} className="object-cover" />
                    <AvatarFallback className="bg-neutral-100 text-[10px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden items-center gap-0.5 lg:flex">
                    Profile
                    <ChevronDown className="size-3" />
                  </span>
                  {profileActive && (
                    <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-ink" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <AccountMenuItems name={name} onLogout={() => void logout()} />
            </DropdownMenu>
          )}
        </nav>

        {/* Mobile: search · alerts · avatar (tabs are in the bottom bar) */}
        <div className="ml-auto flex items-center gap-0.5 md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            className="min-h-11 min-w-11"
            aria-label="Search"
            onClick={goDiscover}
          >
            <Search className="size-5" />
          </Button>
          {session && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account"
                  className="flex min-h-11 min-w-11 items-center justify-center"
                >
                  <Avatar className="size-7 border border-neutral-200">
                    <AvatarImage src={avatarSrc} alt={name} className="object-cover" />
                    <AvatarFallback className="bg-neutral-100 text-[10px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <AccountMenuItems name={name} onLogout={() => void logout()} />
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
