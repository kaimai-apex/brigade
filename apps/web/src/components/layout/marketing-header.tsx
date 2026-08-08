'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { BrandLink } from '@/components/brand/brand-mark';
import { AccountMenuItems } from '@/components/layout/app-nav';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { useAppUser } from '@/components/layout/app-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { resolveAvatarUrl } from '@/lib/avatars';
import { cn, displayName, getInitials } from '@/lib/utils';

const SCROLL_THRESHOLD = 20;

/**
 * FilmUGC-style floating liquid-glass nav — fixed inset bar that stays
 * visible for the whole scroll, gaining a stronger glass fill after 20px.
 * Auth state only swaps the right-side CTAs (Log in / Sign up ↔ avatar menu);
 * the glass chrome never yields to AppNav on the marketing home.
 */
export function MarketingHeader() {
  const { session, logout } = useAuth();
  const user = useAppUser(session?.userId);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const signedIn = Boolean(session);
  const name = user ? displayName(user.firstName, user.lastName) : 'Member';
  const initials = getInitials(user?.firstName, user?.lastName);
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl, session?.userId);

  return (
    <>
      <header
        className={cn('brigade-glass-nav', scrolled && 'brigade-glass-nav-scrolled')}
      >
        <div className="brigade-glass-nav-inner">
          <BrandLink priority markSize={32} />

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
            <Link
              href="/mentors"
              className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--brand-ink)]/70 transition hover:bg-black/5 hover:text-[var(--brand-ink)] md:inline-flex"
            >
              Find a mentor
            </Link>
            <Link
              href={signedIn ? '/mentorship' : '/login?next=/mentorship/setup'}
              className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--brand-ink)]/70 transition hover:bg-black/5 hover:text-[var(--brand-ink)] lg:inline-flex"
            >
              Become a mentor
            </Link>

            {signedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="inline-flex size-10 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(26,26,23,0.12)] transition hover:bg-black/5"
                  >
                    <Avatar className="size-8 border border-black/10">
                      <AvatarImage src={avatarSrc} alt={name} className="object-cover" />
                      <AvatarFallback className="bg-black/5 text-[11px] font-semibold text-[var(--brand-ink)]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <AccountMenuItems name={name} onLogout={() => void logout()} />
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden h-10 items-center rounded-xl px-4 text-[13px] font-semibold text-[var(--brand-ink)] shadow-[inset_0_0_0_1px_rgba(26,26,23,0.18)] transition hover:bg-black/5 sm:inline-flex"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mk-ink)] px-4 text-[13px] font-semibold text-[var(--brand-white)] transition hover:bg-[var(--mk-ink-hover)] sm:px-5"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {signedIn ? <MobileTabBar /> : null}
    </>
  );
}
