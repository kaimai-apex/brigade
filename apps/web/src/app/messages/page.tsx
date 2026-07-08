'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MessagesSquare, RefreshCw, Send } from 'lucide-react';
import { api, type Conversation, type Message } from '@/lib/api/client';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

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

  async function startConversation() {
    if (!participantId.trim()) return;
    try {
      const convo = await api.createConversation(participantId);
      setParticipantId('');
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

        <Card className="mb-4 flex gap-2 p-4">
          <Input
            placeholder="Start chat with a user ID"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startConversation()}
          />
          <Button onClick={startConversation}>Start</Button>
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
