'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { api, type Connection, type SearchResult } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ConnectionsPage() {
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
    try {
      await api.sendConnectionRequest(selectedUser.id);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send request');
    }
  }

  async function accept(id: string) {
    await api.acceptConnection(id);
    await load();
  }

  async function reject(id: string) {
    await api.rejectConnection(id);
    await load();
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display mb-6 text-3xl font-black">Connections</h1>

        <Card className="mb-6 p-4">
          <p className="mb-2 text-sm font-semibold">Find people to connect with</p>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPeople()}
            />
            <Button onClick={searchPeople}>Search</Button>
          </div>
          {searchResults.length > 0 && (
            <ul className="mt-3 space-y-2">
              {searchResults.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(person)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedUser?.id === person.id ? 'border-forest bg-sage/20' : 'border-ink/10'
                    }`}
                  >
                    <span className="font-semibold">{person.name ?? person.title}</span>
                    {person.headline && <span className="ml-2 text-ink/60">{person.headline}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedUser && (
            <Button className="mt-3" onClick={sendRequest}>
              Connect with {selectedUser.name ?? selectedUser.title}
            </Button>
          )}
        </Card>

        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-semibold">Pending requests</h2>
            <div className="space-y-3">
              {pending.map((c) => (
                <Card key={c.id} className="flex items-center justify-between p-4">
                  <Link href={`/profile/${c.senderId}`} className="text-sm hover:underline">
                    Request from {c.senderId.slice(0, 8)}…
                  </Link>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => accept(c.id)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(c.id)}>
                      Reject
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="mb-4 flex justify-between">
          <h2 className="font-semibold">Your network</h2>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        <div className="space-y-3">
          {connections.map((c) => {
            const peerId =
              session?.userId === c.senderId ? c.receiverId : c.senderId;
            return (
              <Card key={c.id} className="p-4">
                <Link href={`/profile/${peerId}`} className="text-sm font-semibold hover:underline">
                  View connection
                </Link>
              </Card>
            );
          })}
          {connections.length === 0 && !loading && (
            <p className="text-center opacity-60">No connections yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
