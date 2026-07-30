'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { api, type Connection } from '@/lib/api/client';
import {
  createBrigade,
  deleteBrigade,
  listBrigades,
  importLegacyTeams,
  type Brigade,
} from '@/lib/brigades/storage';
import { usePersonNames } from '@/hooks/use-person-names';
import { AppPage } from '@/components/layout/app-shell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyBrigadesPage() {
  const { session } = useAuth();
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Memoised so the effect can depend on it honestly. Declaring the dependency
  // without this would rebuild `load` every render and re-fetch in a loop —
  // which is why the rule was being suppressed rather than satisfied.
  const load = useCallback(async () => {
    if (!session?.userId) return;
    setLoading(true);
    try {
      // One-time move of anything left in localStorage by the old
      // implementation, before the first read — otherwise the page would come
      // up empty and look like the teams had been thrown away.
      try {
        const imported = await importLegacyTeams(session.userId);
        if (imported > 0) {
          toast.success(
            imported === 1
              ? 'Moved your saved Brigade to your account'
              : `Moved ${imported} saved Brigades to your account`,
          );
        }
      } catch {
        toast.error('Could not move your locally saved Brigades — they are still on this device');
      }

      const [res, teams] = await Promise.all([
        api.getConnections('accepted'),
        listBrigades(),
      ]);
      setConnections(res.data);
      setBrigades(teams);
    } finally {
      setLoading(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  function peerId(c: Connection) {
    return session?.userId === c.senderId ? c.receiverId : c.senderId;
  }

  // Every id shown anywhere on this page: the people you can pick, plus the
  // members already in a saved Brigade. The picker used to render a truncated
  // UUID, which made choosing a team guesswork.
  const personIds = useMemo(
    () => [
      ...connections.map((c) => peerId(c)),
      ...brigades.flatMap((b) => b.memberIds),
    ],
    // peerId only reads session.userId, which is in the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connections, brigades, session?.userId],
  );
  const { label, initialsFor } = usePersonNames(personIds);

  function toggleMember(userId: string) {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.userId || !name.trim()) return;
    // Not `label` — that name belongs to the usePersonNames lookup above.
    const brigadeName = name.trim();
    try {
      await createBrigade(brigadeName, selectedMembers);
      toast.success(`Brigade "${brigadeName}" created`);
      setName('');
      setSelectedMembers([]);
      setCreating(false);
      setBrigades(await listBrigades());
    } catch (error) {
      // The form keeps its contents so the work is not lost on a failed save.
      toast.error(error instanceof Error ? error.message : 'Could not create Brigade');
    }
  }

  async function handleDelete(brigadeId: string) {
    try {
      await deleteBrigade(brigadeId);
      setBrigades(await listBrigades());
      toast('Brigade removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove Brigade');
    }
  }

  return (
    <AppPage showAuth={false}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-body text-sm font-extrabold uppercase tracking-widest text-rust">
              My Brigades
            </p>
            <h1 className="font-display mt-2 text-3xl font-black">
              Your trusted teams for work
            </h1>
            <p className="mt-2 text-ink/65">
              Groups of professionals from Your Brigade — reusable for events, venues,
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
                  Select members from Your Brigade
                </p>
                {connections.length === 0 ? (
                  <p className="text-sm text-ink/60">
                    Invite people to Your Brigade first, then add them here.{' '}
                    <Link href="/brigade" className="font-semibold text-forest underline">
                      Go to Your Brigade
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
                                {initialsFor(id)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm font-semibold">{label(id)}</span>
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
                      {label(id)}
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
              Assemble trusted teams from Your Brigade — wedding crews, banquet staff,
              festival shifts — and reuse them for every opportunity.
            </p>
            <Button className="mt-6" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Create Brigade
            </Button>
          </Card>
        )}
      </AppPage>
  );
}
