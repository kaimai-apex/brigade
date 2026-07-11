'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/layout/app-nav';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

type AppShellProps = {
  children: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
};

function useCurrentUser(userId: string | undefined) {
  const [user, setUser] = useState<{
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
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
        });
      })
      .catch(() => active && setUser({}));
    return () => {
      active = false;
    };
  }, [userId]);

  return user;
}

export function AppShell({ children, left, right, className }: AppShellProps) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api
      .getNotifications()
      .then((res) => {
        const count = res.data.filter((n) => !n.read).length;
        setUnread(count);
      })
      .catch(() => setUnread(0));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <AppNav user={undefined} unreadNotifications={unread} />
      <div className={cn('mx-auto grid max-w-[1128px] gap-6 px-4 py-6', className)}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[225px_minmax(0,1fr)_300px]">
          {left && <aside className="hidden space-y-2 lg:block">{left}</aside>}
          <main className="min-w-0 space-y-2">{children}</main>
          {right && <aside className="hidden space-y-2 lg:block">{right}</aside>}
        </div>
      </div>
    </div>
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
