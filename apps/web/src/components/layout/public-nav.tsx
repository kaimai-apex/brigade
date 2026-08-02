'use client';

import Link from 'next/link';

type PublicNavProps = {
  showAuth?: boolean;
};

/**
 * ADPList app header — 72px, white, Log in outline + dark "Get started today".
 * Brigade wordmark only; layout/sizes match the ADPList clone.
 */
export function PublicNav({ showAuth = true }: PublicNavProps) {
  return (
    <header className="mk-header w-full">
      <div className="mx-auto flex h-full max-w-[1320px] items-center gap-4 px-5 md:px-8">
        <Link
          href="/"
          aria-label="Brigade home"
          className="text-[22px] font-bold tracking-[-0.02em] text-[var(--mk-text)]"
        >
          Brigade
        </Link>

        {showAuth && (
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <Link
              href="/login?next=/mentorship/setup"
              className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-[var(--mk-muted)] hover:text-[var(--mk-text)] md:inline-flex"
            >
              Become a mentor
            </Link>
            <Link
              href="/login"
              className="mk-btn mk-btn-outline hidden md:inline-flex"
            >
              Log in
            </Link>
            <Link href="/waitlist" className="mk-btn mk-btn-dark">
              Get started today
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
