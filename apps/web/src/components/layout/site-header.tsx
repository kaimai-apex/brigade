'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { api } from '@/lib/api/client';
import { cn, getInitials, displayName } from '@/lib/utils';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/directory', label: 'Directory' },
  { href: '/feed', label: 'Feed' },
  { href: '/connections', label: 'Network' },
  { href: '/companies', label: 'Companies' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/messages', label: 'Messages' },
];

type CurrentUser = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

function useCurrentUser(userId: string | undefined) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }
    let active = true;
    api
      .getProfile(userId)
      .then((res) => {
        if (!active) return;
        const p = res as Record<string, unknown>;
        setUser({
          firstName: (p.firstName ?? p.first_name) as string | undefined,
          lastName: (p.lastName ?? p.last_name) as string | undefined,
          avatarUrl: (p.avatarUrl ?? p.profileImageUrl ?? p.profile_image_url) as
            | string
            | undefined,
        });
      })
      .catch(() => active && setUser({}));
    return () => {
      active = false;
    };
  }, [userId]);
  return user;
}

function NavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'relative text-sm font-semibold transition',
        active ? 'text-ink' : 'text-ink/60 hover:text-ink',
      )}
    >
      {label}
      {active && (
        <span className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-rust" />
      )}
    </Link>
  );
}

export function SiteHeader({ showAuth = true }: { showAuth?: boolean }) {
  const { session, logout } = useAuth();
  const router = useRouter();
  const user = useCurrentUser(session?.userId);
  const [mobileOpen, setMobileOpen] = useState(false);

  const name = user ? displayName(user.firstName, user.lastName) : 'Brigade Member';
  const initials = getInitials(user?.firstName, user?.lastName);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-8">
          <Link
            href={session ? '/dashboard' : '/'}
            className="font-display text-2xl font-black tracking-tight"
          >
            Brigade
          </Link>
          {session && (
            <nav className="hidden items-center gap-6 lg:flex">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {session ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Search"
                    onClick={() =>
                      window.dispatchEvent(new Event('open-command-menu'))
                    }
                  >
                    <Search className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search · ⌘K</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Notifications"
                    asChild
                  >
                    <Link href="/notifications">
                      <Bell className="size-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Alerts</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ml-1 rounded-full ring-offset-2 ring-offset-cream transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    aria-label="Account menu"
                  >
                    <Avatar size="lg" className="border border-ink/10">
                      {user?.avatarUrl && (
                        <AvatarImage src={user.avatarUrl} alt={name} />
                      )}
                      <AvatarFallback className="bg-forest font-semibold text-paper">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${session.userId}`}>
                      <User className="size-4" /> My profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="size-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/notifications">
                      <Settings className="size-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleLogout}
                    className="text-rust focus:text-rust"
                  >
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            showAuth && (
              <div className="hidden items-center gap-4 sm:flex">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-ink/70 transition hover:text-ink"
                >
                  Log in
                </Link>
                <Button asChild size="sm">
                  <Link href="/signup">Join Brigade</Link>
                </Button>
              </div>
            )
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-cream">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl font-black">
                  Brigade
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1 px-4 pb-6">
                {session ? (
                  <>
                    {NAV_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink/80 transition hover:bg-ink/5 hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <Link
                      href="/search"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink/80 transition hover:bg-ink/5 hover:text-ink"
                    >
                      Search
                    </Link>
                    <Link
                      href="/notifications"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink/80 transition hover:bg-ink/5 hover:text-ink"
                    >
                      Alerts
                    </Link>
                  </>
                ) : (
                  showAuth && (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink/80 transition hover:bg-ink/5 hover:text-ink"
                      >
                        Log in
                      </Link>
                      <Button asChild className="mt-2">
                        <Link href="/signup" onClick={() => setMobileOpen(false)}>
                          Join Brigade
                        </Link>
                      </Button>
                    </>
                  )
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
