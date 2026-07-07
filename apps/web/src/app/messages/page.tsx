'use client';

import { useEffect, useState } from 'react';
import { api, type Conversation, type Message } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
    const convo = await api.createConversation(participantId);
    setParticipantId('');
    await loadConversations();
    await selectConversation(convo.id);
  }

  async function sendMessage() {
    if (!selectedId || !message.trim()) return;
    try {
      await api.sendMessage(selectedId, message);
      setMessage('');
      const res = await api.getMessages(selectedId);
      setMessages(res.data ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send');
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-black">Messages</h1>
          <Button variant="outline" onClick={loadConversations} disabled={loading}>
            Refresh
          </Button>
        </div>

        <Card className="mb-4 flex gap-2 p-4">
          <Input
            placeholder="Start chat with user ID"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
          />
          <Button onClick={startConversation}>Start</Button>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            {conversations.map((c) => (
              <Card
                key={c.id}
                className={`cursor-pointer p-3 ${selectedId === c.id ? 'ring-2 ring-ink' : ''}`}
                onClick={() => selectConversation(c.id)}
              >
                <p className="text-sm font-semibold">{c.participants.join(', ')}</p>
                <p className="text-xs opacity-60">
                  {new Date(c.lastMessageAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
          <div className="md:col-span-2">
            {selectedId ? (
              <Card className="space-y-4 p-4">
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {messages.map((m) => (
                    <p key={m.id} className="rounded-lg bg-cream px-3 py-2 text-sm">
                      {m.body}
                    </p>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage}>Send</Button>
                </div>
              </Card>
            ) : (
              <p className="text-center opacity-60">Select a conversation</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
