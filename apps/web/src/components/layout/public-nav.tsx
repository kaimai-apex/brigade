'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

type PublicNavProps = {
  showAuth?: boolean;
};

export function PublicNav({ showAuth = true }: PublicNavProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-[52px] max-w-[1128px] items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-display text-xl font-black tracking-tight text-ink"
        >
          Brigade
        </Link>

        {showAuth && (
          <nav className="flex items-center gap-3">
            <Button asChild variant="gold" size="sm" className="min-h-11 max-w-[9.5rem] px-3 text-[13px] sm:max-w-none sm:px-4 sm:text-sm">
              <Link href="/waitlist">Join Waitlist</Link>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
