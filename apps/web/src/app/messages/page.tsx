'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MessagesSquare, RefreshCw, Search, Send } from 'lucide-react';
import {
  api,
  type Conversation,
  type Message,
  type SearchResult,
} from '@/lib/api/client';
import { useAuth } from '@/components/auth/auth-provider';
import { SiteHeader } from '@/components/layout/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function convoInitials(participants: string[]) {
  const first = participants[0] ?? '?';
  return first.slice(0, 2).toUpperCase();
}

export default function MessagesPage() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // people-picker for starting a new chat by name
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

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

  // Live message push (SSE): append to the open conversation as they arrive.
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
        /* ignore malformed frames */
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
    const res = await api.getMessages(id);
    setMessages(res.data ?? []);
  }

  // debounced people search (excludes self)
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

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-black">Messages</h1>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={loadConversations}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          </Button>
        </div>

        <Card className="relative mb-4 p-4">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-ink/40" />
            <Input
              placeholder="Search people to message…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </div>

          {query.trim().length >= 2 && (
            <div className="absolute left-4 right-4 top-14 z-20 overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-lg">
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
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    {p.headline && (
                      <p className="truncate text-xs text-ink/55">{p.headline}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </Card>
              ))}
            {!loading &&
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className="w-full text-left"
                >
                  <Card
                    className={cn(
                      'flex items-center gap-3 p-3 transition hover:bg-ink/5',
                      selectedId === c.id && 'ring-2 ring-forest',
                    )}
                  >
                    <Avatar size="default">
                      <AvatarFallback className="bg-secondary text-xs font-semibold text-forest">
                        {convoInitials(c.participants)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {c.participants.map((p) => p.slice(0, 6)).join(', ')}
                      </p>
                      <p className="text-xs text-ink/50">
                        {new Date(c.lastMessageAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                </button>
              ))}
            {!loading && conversations.length === 0 && (
              <Card className="p-6 text-center text-sm text-ink/60">
                No conversations yet.
              </Card>
            )}
          </div>

          <div className="md:col-span-2">
            {selectedId ? (
              <Card className="flex h-[28rem] flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className="w-fit max-w-[80%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm text-ink"
                      >
                        {m.body}
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="py-8 text-center text-sm text-ink/50">
                        No messages yet — say hello.
                      </p>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 border-t border-ink/10 p-3">
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
              </Card>
            ) : (
              <Card className="flex h-[28rem] flex-col items-center justify-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
                  <MessagesSquare className="size-6" />
                </div>
                <p className="font-display text-lg font-bold">Your messages</p>
                <p className="max-w-xs text-sm text-ink/60">
                  Select a conversation or start a new one to begin chatting.
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
