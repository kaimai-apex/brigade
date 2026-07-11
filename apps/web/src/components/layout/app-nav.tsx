'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Briefcase,
  ChevronDown,
  Home,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  User,
  Users,
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
import { cn, displayName, getInitials } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home, match: (p: string) => p === '/dashboard' },
  { href: '/network', label: 'Network', icon: Users, match: (p: string) => p.startsWith('/network') },
  {
    href: '/opportunities',
    label: 'Opportunities',
    icon: Briefcase,
    match: (p: string) => p.startsWith('/opportunities') || p.startsWith('/jobs'),
  },
  { href: '/messages', label: 'Messaging', icon: MessageSquare, match: (p: string) => p.startsWith('/messages') },
  {
    href: '/notifications',
    label: 'Notifications',
    icon: Bell,
    match: (p: string) => p.startsWith('/notifications'),
  },
] as const;

type AppNavProps = {
  user?: { firstName?: string; lastName?: string; avatarUrl?: string };
  unreadNotifications?: number;
};

export function AppNav({ user, unreadNotifications = 0 }: AppNavProps) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const name = user ? displayName(user.firstName, user.lastName) : 'Member';
  const initials = getInitials(user?.firstName, user?.lastName);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-[52px] max-w-[1128px] items-center gap-3 px-4">
        <Link
          href="/dashboard"
          className="shrink-0 font-display text-xl font-black tracking-tight text-ink"
        >
          Brigade
        </Link>

        <div className="hidden min-w-0 flex-1 sm:block sm:max-w-[280px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
            <Input
              readOnly
              placeholder="Search"
              className="h-9 rounded-md border-neutral-300 bg-neutral-50 pl-9 text-sm"
              onFocus={() => window.dispatchEvent(new Event('open-command-menu'))}
            />
          </div>
        </div>

        <nav className="ml-auto flex items-stretch">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            const showBadge = item.label === 'Notifications' && unreadNotifications > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex min-w-[64px] flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-medium transition',
                  active ? 'text-ink' : 'text-neutral-600 hover:text-ink',
                )}
              >
                <span className="relative flex h-6 items-center justify-center">
                  <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                  {showBadge && (
                    <span className="absolute -right-1 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rust text-[9px] font-bold text-white">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
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
                  className="flex min-w-[64px] flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-medium text-neutral-600 hover:text-ink"
                >
                  <Avatar className="size-6 border border-neutral-200">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
                    <AvatarFallback className="bg-neutral-100 text-[10px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden items-center gap-0.5 lg:flex">
                    Me
                    <ChevronDown className="size-3" />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${session.userId}`}>
                    <User className="size-4" /> View profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/notifications">
                    <Settings className="size-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void logout()}
                  className="text-rust focus:text-rust"
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          aria-label="Search"
          onClick={() => window.dispatchEvent(new Event('open-command-menu'))}
        >
          <Search className="size-5" />
        </Button>
      </div>
    </header>
  );
}
