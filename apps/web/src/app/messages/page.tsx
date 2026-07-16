'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, MessagesSquare, Plus, Search, Send } from 'lucide-react';
import {
  api,
  type Conversation,
  type Message,
  type SearchResult,
} from '@/lib/api/client';
import { useAuth } from '@/components/auth/auth-provider';
import { AppPage } from '@/components/layout/app-shell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonNames } from '@/hooks/use-person-names';
import { cn, relativeTime } from '@/lib/utils';

export default function MessagesPage() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const peerIds = useMemo(() => {
    const ids: string[] = [];
    for (const c of conversations) {
      for (const p of c.participants) {
        if (p !== session?.userId) ids.push(p);
      }
    }
    return ids;
  }, [conversations, session?.userId]);
  const { label, initialsFor } = usePersonNames(peerIds);

  async function loadConversations() {
    setLoading(true);
    try {
      const res = await api.getConversations();
      setConversations(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/stream/messages');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event !== 'message' || !data.message) return;
        const m = data.message as Message;
        void loadConversations();
        if (m.conversationId === selectedIdRef.current) {
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(async () => {
      const res = await api.getMessages(selectedId);
      setMessages(res.data ?? []);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedId]);

  async function selectConversation(id: string) {
    setSelectedId(id);
    setComposing(false);
    const res = await api.getMessages(id);
    setMessages(res.data ?? []);
  }

  useEffect(() => {
    if (query.trim().length < 2) {
      setPeople([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.search(query, 'people');
        setPeople(
          (res.data ?? []).filter(
            (r) => r.type === 'people' && r.id !== session?.userId,
          ),
        );
      } catch {
        setPeople([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, session?.userId]);

  async function startWith(participantId: string) {
    try {
      const convo = await api.createConversation(participantId);
      setQuery('');
      setPeople([]);
      setComposing(false);
      await loadConversations();
      await selectConversation(convo.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start conversation');
    }
  }

  async function sendMessage() {
    if (!selectedId || !message.trim()) return;
    try {
      await api.sendMessage(selectedId, message);
      setMessage('');
      const res = await api.getMessages(selectedId);
      setMessages(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send');
    }
  }

  function peerOf(c: Conversation) {
    return c.participants.find((p) => p !== session?.userId) ?? c.participants[0];
  }

  // Mobile: conversation view is full-screen push (no desktop split)
  if (selectedId) {
    const active = conversations.find((c) => c.id === selectedId);
    const peer = active ? peerOf(active) : null;
    return (
      <AppPage showAuth={false} wide mainClassName="py-0 px-0 max-w-none">
        <div className="flex h-[calc(100dvh-3rem-56px-env(safe-area-inset-bottom))] flex-col md:mx-auto md:max-w-2xl md:px-4 md:py-4">
          <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="touch-compact"
              onClick={() => setSelectedId(null)}
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <p className="truncate text-[15px] font-semibold">
              {peer ? label(peer) : 'Conversation'}
            </p>
          </div>
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-2">
              {messages.map((m) => {
                const mine = m.senderId === session?.userId;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'w-fit max-w-[80%] rounded-2xl px-3 py-2 text-[15px]',
                      mine
                        ? 'ml-auto rounded-tr-sm bg-forest text-paper'
                        : 'rounded-tl-sm bg-secondary text-ink',
                    )}
                  >
                    {m.body}
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="py-8 text-center text-body-md text-ink/50">
                  No messages yet — say hello.
                </p>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2 border-t border-ink/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Input
              placeholder="Type a message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} size="icon" aria-label="Send">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage showAuth={false} wide mainClassName="py-4 relative">
      <h1 className="text-page-title mb-4">Messages</h1>

      {(composing || query.length > 0) && (
        <Card className="relative mb-4 p-3">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-ink/40" />
            <Input
              autoFocus
              placeholder="Search people to message…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </div>
          {query.trim().length >= 2 && (
            <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-ink/10">
              {searching && people.length === 0 && (
                <p className="px-4 py-3 text-sm text-ink/50">Searching…</p>
              )}
              {!searching && people.length === 0 && (
                <p className="px-4 py-3 text-sm text-ink/50">No people found.</p>
              )}
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => startWith(p.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-ink/5"
                >
                  <Avatar size="sm">
                    <AvatarFallback className="bg-secondary text-xs font-semibold text-forest">
                      {(p.name ?? '?')
                        .split(/\s+/)
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{p.name}</p>
                    {p.headline && (
                      <p className="truncate text-meta text-ink/55">{p.headline}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="space-y-0 divide-y divide-neutral-100">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex h-16 items-center gap-3 py-2">
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        {!loading &&
          conversations.map((c) => {
            const peer = peerOf(c);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className="flex h-16 w-full items-center gap-3 py-2 text-left active:bg-neutral-50"
              >
                <Avatar className="size-11">
                  <AvatarFallback className="bg-secondary text-xs font-semibold text-forest">
                    {initialsFor(peer)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[15px] font-semibold">{label(peer)}</p>
                    <span className="shrink-0 text-meta text-ink/50">
                      {relativeTime(c.lastMessageAt)}
                    </span>
                  </div>
                  <p className="truncate text-meta text-ink/55">Tap to open conversation</p>
                </div>
              </button>
            );
          })}
        {!loading && conversations.length === 0 && (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
              <MessagesSquare className="size-6" />
            </div>
            <p className="text-section-title">No conversations yet</p>
            <p className="text-body-md text-ink/60">
              Start a conversation with someone in the community.
            </p>
            <Button className="mt-1 w-full max-w-xs" onClick={() => setComposing(true)}>
              Start a conversation
            </Button>
          </Card>
        )}
      </div>

      {/* FAB above tab bar */}
      <button
        type="button"
        onClick={() => setComposing(true)}
        aria-label="New message"
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-forest text-paper shadow-lg md:right-8"
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)' }}
      >
        <Plus className="size-6" />
      </button>
    </AppPage>
  );
}
