'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Compass,
  GraduationCap,
  Search,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { PRIMARY_NAV, SECONDARY_NAV } from '@/lib/nav';

/**
 * Global ⌘K / Ctrl+K command palette. Also opens when any element dispatches
 * the `open-command-menu` window event (used by the header search button).
 */
export function CommandMenu() {
  const router = useRouter();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('open-command-menu', onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-menu', onOpen);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const trimmed = query.trim();

  const navIcons: Record<string, typeof Users> = {
    Mentors: GraduationCap,
    Directory: Compass,
    Sessions: Calendar,
    Profile: User,
    'Your mentoring': Users,
    Settings: Settings,
  };

  const primaryNav = PRIMARY_NAV.map((item) =>
    item.href === '/profile/me' && session
      ? { ...item, href: `/profile/${session.userId}` as const }
      : item,
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command menu"
      description="Search mentors and jump around Brigade"
    >
      <CommandInput
        placeholder="Search mentors…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {trimmed.length > 0 && (
          <>
            <CommandGroup heading="Search">
              <CommandItem
                value={`search ${trimmed}`}
                onSelect={() =>
                  go(`/mentors?q=${encodeURIComponent(trimmed)}`)
                }
              >
                <Search />
                Search mentors for “{trimmed}”
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Go to">
          {primaryNav.map((item) => {
            const Icon = navIcons[item.label] ?? Users;
            return (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => go(item.href)}
              >
                <Icon />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="More">
          {SECONDARY_NAV.map((item) => {
            const Icon = navIcons[item.label] ?? Settings;
            return (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => go(item.href)}
              >
                <Icon />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
