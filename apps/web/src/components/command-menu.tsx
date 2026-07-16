'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  Compass,
  MessageSquare,
  Newspaper,
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
    Feed: Newspaper,
    Brigade: Users,
    Discover: Compass,
    Messages: MessageSquare,
    Profile: User,
    Companies: Building2,
    Alerts: Bell,
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
      description="Search people and companies in Brigade"
    >
      <CommandInput
        placeholder="Search people & companies…"
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
                  go(`/discover?focus=1&q=${encodeURIComponent(trimmed)}`)
                }
              >
                <Search />
                Search for “{trimmed}”
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
