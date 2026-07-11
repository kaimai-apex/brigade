'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type PublicNavProps = {
  showAuth?: boolean;
};

export function PublicNav({ showAuth = true }: PublicNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-[52px] max-w-[1128px] items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-display text-xl font-black tracking-tight text-ink"
        >
          Brigade
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="/discover"
            className="text-sm font-semibold text-neutral-600 transition hover:text-ink"
          >
            Discover
          </Link>
          {showAuth && (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-neutral-600 transition hover:text-ink"
              >
                Log in
              </Link>
              <Button asChild size="sm">
                <Link href="/signup">Join Brigade</Link>
              </Button>
            </>
          )}
        </nav>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="sm:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-white">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl font-black">Brigade</SheetTitle>
            </SheetHeader>
            <nav className="mt-4 flex flex-col gap-1 px-2">
              <Link
                href="/discover"
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Discover
              </Link>
              {showAuth && (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Log in
                  </Link>
                  <Button asChild className="mt-2">
                    <Link href="/signup" onClick={() => setMobileOpen(false)}>
                      Join Brigade
                    </Link>
                  </Button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
