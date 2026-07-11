'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Building2, MapPin, Plus, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { api, type Connection } from '@/lib/api/client';
import {
  createBrigade,
  deleteBrigade,
  listBrigades,
  type Brigade,
} from '@/lib/brigades/storage';
import { SiteHeader } from '@/components/layout/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

function initials(text: string) {
  const parts = text.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return text.slice(0, 2).toUpperCase() || '?';
}

export default function MyBrigadesPage() {
  const { session } = useAuth();
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  async function load() {
    if (!session?.userId) return;
    setLoading(true);
    try {
      const res = await api.getConnections('accepted');
      setConnections(res.data);
      setBrigades(listBrigades(session.userId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [session?.userId]);

  function peerId(c: Connection) {
    return session?.userId === c.senderId ? c.receiverId : c.senderId;
  }

  function toggleMember(userId: string) {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.userId || !name.trim()) return;
    createBrigade(session.userId, name, selectedMembers);
    toast.success(`Brigade "${name.trim()}" created`);
    setName('');
    setSelectedMembers([]);
    setCreating(false);
    setBrigades(listBrigades(session.userId));
  }

  function handleDelete(brigadeId: string) {
    if (!session?.userId) return;
    deleteBrigade(session.userId, brigadeId);
    setBrigades(listBrigades(session.userId));
    toast('Brigade removed');
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-body text-sm font-extrabold uppercase tracking-widest text-rust">
              My Brigades
            </p>
            <h1 className="font-display mt-2 text-3xl font-black">
              Your trusted teams for work
            </h1>
            <p className="mt-2 text-ink/65">
              Groups of professionals from your Network — reusable for events, venues,
              and opportunities.
            </p>
          </div>
          {!creating && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              New Brigade
            </Button>
          )}
        </div>

        {creating && (
          <Card className="mb-6 p-5">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="brigade-name">Brigade name</Label>
                <Input
                  id="brigade-name"
                  placeholder="e.g. Wedding Brigade, Festival Crew"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">
                  Select members from your Network
                </p>
                {connections.length === 0 ? (
                  <p className="text-sm text-ink/60">
                    Connect with professionals first, then add them to a Brigade.{' '}
                    <Link href="/network" className="font-semibold text-forest underline">
                      Go to Network
                    </Link>
                  </p>
                ) : (
                  <ul className="max-h-48 space-y-2 overflow-y-auto">
                    {connections.map((c) => {
                      const id = peerId(c);
                      const selected = selectedMembers.includes(id);
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => toggleMember(id)}
                            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                              selected
                                ? 'border-forest bg-secondary'
                                : 'border-ink/10 hover:bg-ink/5'
                            }`}
                          >
                            <Avatar size="sm">
                              <AvatarFallback className="bg-secondary text-xs font-semibold text-forest">
                                {initials(id)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm font-semibold">
                              {id.slice(0, 8)}…
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={!name.trim()}>
                  Create Brigade
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading &&
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="mb-4 p-5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-3 h-4 w-32" />
            </Card>
          ))}

        {!loading &&
          brigades.map((brigade) => (
            <Card key={brigade.id} className="mb-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{brigade.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/60">
                    <Users className="size-4" />
                    {brigade.memberIds.length}{' '}
                    {brigade.memberIds.length === 1 ? 'member' : 'members'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${brigade.name}`}
                  onClick={() => handleDelete(brigade.id)}
                >
                  <Trash2 className="size-4 text-rust" />
                </Button>
              </div>
              {brigade.memberIds.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {brigade.memberIds.map((id) => (
                    <Badge key={id} variant="secondary">
                      {id.slice(0, 8)}…
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}

        {!loading && brigades.length === 0 && !creating && (
          <Card className="p-12 text-center">
            <p className="font-display text-2xl font-bold">Create your first Brigade.</p>
            <p className="mt-3 text-ink/65">
              Build trusted teams from your Network for events and opportunities.
            </p>
            <Button className="mt-6" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Create Brigade
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
