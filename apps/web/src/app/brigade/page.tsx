'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { api, type Connection } from '@/lib/api/client';
import { AppPage } from '@/components/layout/app-shell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersonNames } from '@/hooks/use-person-names';

export default function BrigadePage() {
  const { session } = useAuth();
  const [members, setMembers] = useState<Connection[]>([]);
  const [pending, setPending] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [accepted, incoming] = await Promise.all([
        api.getConnections('accepted'),
        api.getConnections('pending'),
      ]);
      setMembers(accepted.data);
      setPending(incoming.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const personIds = useMemo(() => {
    const ids: string[] = [];
    for (const c of members) {
      ids.push(
        (session?.userId === c.senderId ? c.receiverId : c.senderId) ?? '',
      );
    }
    for (const c of pending) ids.push(c.senderId);
    return ids.filter(Boolean);
  }, [members, pending, session?.userId]);
  const { label, initialsFor } = usePersonNames(personIds);

  async function accept(id: string) {
    await api.acceptConnection(id);
    toast.success('You joined the Brigade');
    await load();
  }

  async function reject(id: string) {
    await api.rejectConnection(id);
    toast('Invitation declined');
    await load();
  }

  return (
    <AppPage showAuth={false} mainClassName="py-4">
      <h1 className="text-page-title mb-4">Your Brigade</h1>

      <Tabs defaultValue="members">
        <TabsList className="mb-4 h-11 w-full justify-start gap-0 rounded-none border-b border-neutral-200 bg-transparent p-0">
          <TabsTrigger
            value="members"
            className="min-h-11 flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-forest data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Members
            {members.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {members.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="invitations"
            className="min-h-11 flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-forest data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Invitations
            {pending.length > 0 && (
              <Badge className="ml-2 bg-rust text-paper">{pending.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-3">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </Card>
            ))}
          {!loading &&
            members.map((c) => {
              const peerId =
                (session?.userId === c.senderId ? c.receiverId : c.senderId) ?? '';
              return (
                <Card key={c.id} className="flex items-center justify-between gap-3 p-4">
                  <Link
                    href={`/profile/${peerId}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-secondary font-semibold text-forest">
                        {initialsFor(peerId)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-[15px] font-semibold hover:underline">
                      {label(peerId)}
                    </span>
                  </Link>
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link href={`/messages?to=${peerId}`}>Message</Link>
                  </Button>
                </Card>
              );
            })}
          {!loading && members.length === 0 && (
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero/chef-bartender.jpg"
                alt=""
                className="h-28 w-28 rounded-2xl object-cover mix-blend-multiply"
              />
              <p className="text-section-title">Your Brigade is empty</p>
              <p className="text-body-md text-ink/60">
                Find your first Brigade member and start building relationships.
              </p>
              <Button asChild className="mt-1 w-full max-w-xs">
                <Link href="/discover">Find people</Link>
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-3">
          {pending.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/profile/${c.senderId}`}
                className="flex min-w-0 items-center gap-3"
              >
                <Avatar className="size-10">
                  <AvatarFallback className="bg-secondary font-semibold text-forest">
                    {initialsFor(c.senderId)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-[15px] font-semibold hover:underline">
                  {label(c.senderId)} invited you
                </span>
              </Link>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 sm:flex-none" onClick={() => accept(c.id)}>
                  Join Brigade
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => reject(c.id)}
                >
                  Decline
                </Button>
              </div>
            </Card>
          ))}
          {pending.length === 0 && (
            <Card className="p-10 text-center text-body-md text-ink/60">
              No Brigade invitations.
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AppPage>
  );
}
