'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const SCROLL_THRESHOLD = 20;

/**
 * FilmUGC-style floating liquid-glass nav — fixed inset bar that stays
 * visible for the whole scroll, gaining a stronger glass fill after 20px.
 */
export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn('brigade-glass-nav', scrolled && 'brigade-glass-nav-scrolled')}
    >
      <div className="brigade-glass-nav-inner">
        <Link
          href="/"
          aria-label="Brigade home"
          className="font-display text-[22px] font-black tracking-[-0.02em] text-[var(--brand-ink)]"
        >
          Brigade
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/mentors"
            className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--brand-ink)]/70 transition hover:bg-black/5 hover:text-[var(--brand-ink)] md:inline-flex"
          >
            Find a mentor
          </Link>
          <Link
            href="/login?next=/mentorship/setup"
            className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--brand-ink)]/70 transition hover:bg-black/5 hover:text-[var(--brand-ink)] lg:inline-flex"
          >
            Become a mentor
          </Link>
          <Link
            href="/login"
            className="hidden h-10 items-center rounded-xl px-4 text-[13px] font-semibold text-[var(--brand-ink)] shadow-[inset_0_0_0_1px_rgba(26,26,23,0.18)] transition hover:bg-black/5 sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/book"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mk-ink)] px-4 text-[13px] font-semibold text-[var(--brand-white)] transition hover:bg-[var(--mk-ink-hover)] sm:px-5"
          >
            Book a call
          </Link>
        </div>
      </div>
    </header>
  );
}
