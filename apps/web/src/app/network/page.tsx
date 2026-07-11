'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { RefreshCw, Search, UserPlus } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { api, type Connection, type SearchResult } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function initials(text: string) {
  const parts = text.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return text.slice(0, 2).toUpperCase() || '?';
}

export default function NetworkPage() {
  const { session } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pending, setPending] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [accepted, incoming] = await Promise.all([
        api.getConnections('accepted'),
        api.getConnections('pending'),
      ]);
      setConnections(accepted.data);
      setPending(incoming.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function searchPeople() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.search(searchQuery, 'user');
      setSearchResults(res.data.filter((r) => r.type === 'user'));
    } catch {
      setSearchResults([]);
    }
  }

  async function sendRequest() {
    if (!selectedUser) return;
    const label = selectedUser.name ?? selectedUser.title;
    try {
      await api.sendConnectionRequest(selectedUser.id);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      toast.success(`Connection request sent to ${label}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send request');
    }
  }

  async function accept(id: string) {
    await api.acceptConnection(id);
    toast.success('Connection accepted');
    await load();
  }

  async function reject(id: string) {
    await api.rejectConnection(id);
    toast('Request declined');
    await load();
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="font-body text-sm font-extrabold uppercase tracking-widest text-rust">
          Network
        </p>
        <h1 className="font-display mt-2 mb-2 text-3xl font-black">
          Professionals you&apos;ve connected with
        </h1>
        <p className="mb-6 text-ink/65">
          Trusted contacts and collaborators — add them to your Brigades for work.
        </p>

        <Card className="mb-6 p-4">
          <p className="mb-2 text-sm font-semibold">Find people on Discover</p>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPeople()}
            />
            <Button onClick={searchPeople}>
              <Search className="size-4" />
              Search
            </Button>
          </div>
          {searchResults.length > 0 && (
            <ul className="mt-3 space-y-2">
              {searchResults.map((person) => {
                const label = person.name ?? person.title ?? 'Member';
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(person)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition',
                        selectedUser?.id === person.id
                          ? 'border-forest bg-secondary'
                          : 'border-ink/10 hover:bg-ink/5',
                      )}
                    >
                      <Avatar size="sm">
                        <AvatarFallback className="bg-secondary text-xs font-semibold text-forest">
                          {initials(label)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {label}
                        </span>
                        {person.headline && (
                          <span className="block truncate text-xs text-ink/60">
                            {person.headline}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {selectedUser && (
            <Button className="mt-3 w-full" onClick={sendRequest}>
              <UserPlus className="size-4" />
              Connect with {selectedUser.name ?? selectedUser.title}
            </Button>
          )}
          <Button asChild variant="link" className="mt-3 h-auto p-0 text-forest">
            <Link href="/discover">Browse all professionals on Discover</Link>
          </Button>
        </Card>

        <Tabs defaultValue="connections">
          <div className="mb-4 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="connections">
                Connections
                {connections.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {connections.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests">
                Requests
                {pending.length > 0 && (
                  <Badge className="ml-2 bg-rust text-paper">{pending.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon-sm" onClick={load} aria-label="Refresh">
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            </Button>
          </div>

          <TabsContent value="connections" className="space-y-3">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="size-10 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </Card>
              ))}
            {!loading &&
              connections.map((c) => {
                const peerId =
                  (session?.userId === c.senderId ? c.receiverId : c.senderId) ?? '';
                return (
                  <Card key={c.id} className="flex items-center justify-between gap-3 p-4">
                    <Link
                      href={`/profile/${peerId}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <Avatar size="lg">
                        <AvatarFallback className="bg-secondary font-semibold text-forest">
                          {initials(peerId)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-semibold hover:underline">
                        {peerId.slice(0, 8)}…
                      </span>
                    </Link>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/messages?to=${peerId}`}>Message</Link>
                    </Button>
                  </Card>
                );
              })}
            {!loading && connections.length === 0 && (
              <Card className="p-10 text-center">
                <p className="font-display text-lg font-bold">You haven&apos;t connected with anyone yet.</p>
                <p className="mt-2 text-ink/60">
                  Start discovering professionals to build your network.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/discover">Go to Discover</Link>
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-3">
            {pending.map((c) => (
              <Card key={c.id} className="flex items-center justify-between gap-3 p-4">
                <Link
                  href={`/profile/${c.senderId}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <Avatar size="lg">
                    <AvatarFallback className="bg-secondary font-semibold text-forest">
                      {initials(c.senderId)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-semibold hover:underline">
                    {c.senderId.slice(0, 8)}…
                  </span>
                </Link>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => accept(c.id)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(c.id)}>
                    Decline
                  </Button>
                </div>
              </Card>
            ))}
            {pending.length === 0 && (
              <Card className="p-10 text-center text-ink/60">
                No pending requests.
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
