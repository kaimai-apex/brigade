'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Send } from 'lucide-react';
import { api, type Comment, type Post } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { ReactionBar } from '@/components/feed/reaction-bar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

type FullPost = Post & { comments?: Comment[] };

function shortId(id: string) {
  return id.slice(0, 2).toUpperCase();
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [post, setPost] = useState<FullPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    let active = true;
    api
      .getPost(id)
      .then((p) => active && setPost(p as FullPost))
      .catch((e) => active && toast.error(e instanceof Error ? e.message : 'Not found'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function submitComment() {
    const text = draft.trim();
    if (!text || !post) return;
    try {
      const comment = (await api.addComment(post.id, text)) as Comment;
      setPost((p) =>
        p ? { ...p, comments: [...(p.comments ?? []), comment] } : p,
      );
      setDraft('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to comment');
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link
          href="/feed"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 transition hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to feed
        </Link>

        {loading && (
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </Card>
        )}

        {!loading && !post && (
          <Card className="p-10 text-center text-ink/60">
            This post doesn&rsquo;t exist or was removed.
          </Card>
        )}

        {post && (
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarFallback className="bg-secondary text-sm font-semibold text-forest">
                  {shortId(post.authorId)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Link
                  href={`/profile/${post.authorId}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {post.authorId.slice(0, 8)}…
                </Link>
                <p className="text-xs text-ink/50">
                  {new Date(post.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            {post.mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.mediaUrl}
                alt=""
                className="mt-3 max-h-96 w-full rounded-xl object-cover"
              />
            )}

            <div className="mt-4">
              <ReactionBar post={post} commentCount={post.comments?.length ?? 0} />
            </div>

            <Separator className="my-4" />

            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              />
              <Button onClick={submitComment} disabled={!draft.trim()}>
                <Send className="size-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {(post.comments ?? []).map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Avatar size="sm" className="mt-0.5">
                    <AvatarFallback className="bg-muted text-[10px] font-semibold text-ink/70">
                      {shortId(c.authorId)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl bg-cream px-3.5 py-2">
                    <Link
                      href={`/profile/${c.authorId}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {c.authorId.slice(0, 8)}…
                    </Link>
                    <p className="text-sm text-ink/80">{c.content}</p>
                  </div>
                </div>
              ))}
              {(post.comments?.length ?? 0) === 0 && (
                <p className="py-2 text-center text-sm text-ink/50">
                  No comments yet — start the conversation.
                </p>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
