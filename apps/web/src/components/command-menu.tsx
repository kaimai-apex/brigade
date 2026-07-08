'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Briefcase,
  Building2,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  Users,
  UsersRound,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/directory', label: 'Directory', icon: UsersRound },
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/connections', label: 'Network', icon: Users },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/settings/notifications', label: 'Settings', icon: Settings },
];

/**
 * Global ⌘K / Ctrl+K command palette. Also opens when any element dispatches
 * the `open-command-menu` window event (used by the header search button).
 */
export function CommandMenu() {
  const router = useRouter();
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

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command menu"
      description="Search and jump anywhere in Brigade"
    >
      <CommandInput
        placeholder="Search or jump to…"
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
                onSelect={() => go(`/search?q=${encodeURIComponent(trimmed)}`)}
              >
                <Search />
                Search Brigade for “{trimmed}”
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Go to">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => go(item.href)}
              >
                <Icon />
                {item.label}
                {item.href === '/dashboard' && (
                  <CommandShortcut>Home</CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
