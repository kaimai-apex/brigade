'use client';

import Link from 'next/link';
import { BrandLink } from '@/components/brand/brand-mark';
import { DISCORD_INVITE_URL } from '@/lib/community';

type PublicNavProps = {
  showAuth?: boolean;
};

/**
 * Marketplace header — B mark home link, clear next actions.
 */
export function PublicNav({ showAuth = true }: PublicNavProps) {
  return (
    <header className="mk-header w-full">
      <div className="mx-auto flex h-full max-w-[1320px] items-center gap-4 px-5 md:px-8">
        <BrandLink markSize={32} />

        {showAuth && (
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <Link
              href="/accelerator"
              className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-[var(--mk-muted)] hover:text-[var(--mk-text)] sm:inline-flex"
            >
              Accelerator
            </Link>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-[var(--mk-muted)] hover:text-[var(--mk-text)] md:inline-flex"
            >
              Discord
            </a>
            <Link
              href="/login"
              className="mk-btn mk-btn-outline hidden sm:inline-flex"
            >
              Log in
            </Link>
            <Link href="/apply" className="mk-btn mk-btn-dark">
              Apply
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
