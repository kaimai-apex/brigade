'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { api } from '@/lib/api/client';
import { AppNav } from '@/components/layout/app-nav';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { PublicNav } from '@/components/layout/public-nav';
import { cn } from '@/lib/utils';

function useCurrentUser(userId: string | undefined) {
  const [user, setUser] = useState<{
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    headline?: string;
    role?: string;
    city?: string;
    coverUrl?: string;
    openToOpportunities?: boolean;
  } | null>(null);

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
          headline: (p.headline as string | undefined) ?? undefined,
          role: (p.role as string | undefined) ?? undefined,
          city: (p.city as string | undefined) ?? undefined,
          coverUrl: (p.coverUrl ?? p.cover_url) as string | undefined,
          openToOpportunities: Boolean(p.openToOpportunities ?? p.open_to_opportunities),
        });
      })
      .catch(() => active && setUser({}));
    return () => {
      active = false;
    };
  }, [userId]);

  return user;
}

type PageHeaderProps = {
  showAuth?: boolean;
};

/** Logged-in → AppNav; logged-out → PublicNav */
export function PageHeader({ showAuth = true }: PageHeaderProps) {
  const { session, loading } = useAuth();
  const user = useCurrentUser(session?.userId);

  // While cookies hydrate, show the public nav so SSR/first paint already has
  // Log in / Book a call. Authed users swap to AppNav.
  if (loading || !session) {
    return <PublicNav showAuth={showAuth} />;
  }

  return (
    <>
      <AppNav user={user ?? undefined} />
      <MobileTabBar />
    </>
  );
}

type AppPageProps = {
  children: React.ReactNode;
  className?: string;
  mainClassName?: string;
  showAuth?: boolean;
  /** Wider content area for dense layouts (messages, admin) */
  wide?: boolean;
};

/** Standard white page shell used across Brigade */
export function AppPage({
  children,
  className,
  mainClassName,
  showAuth = true,
  wide = false,
}: AppPageProps) {
  return (
    <div className={cn('min-h-screen bg-white text-ink', className)}>
      <PageHeader showAuth={showAuth} />
      <div
        className={cn(
          'mx-auto px-4 py-6',
          wide ? 'max-w-6xl' : 'max-w-[1128px]',
          mainClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

type AppShellProps = {
  children: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  showAuth?: boolean;
};

/** Three-column HUD layout (dashboard home) */
export function AppShell({ children, left, right, showAuth = true }: AppShellProps) {
  return (
    <AppPage showAuth={showAuth} mainClassName="py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[225px_minmax(0,1fr)_300px]">
        {left && <aside className="hidden space-y-2 lg:block">{left}</aside>}
        <main className="min-w-0 space-y-2">{children}</main>
        {right && <aside className="hidden space-y-2 lg:block">{right}</aside>}
      </div>
    </AppPage>
  );
}

export function HudCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function useAppUser(userId: string | undefined) {
  return useCurrentUser(userId);
}
