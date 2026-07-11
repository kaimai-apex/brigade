'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { RefreshCw, Send } from 'lucide-react';
import { api, type Comment, type Post, type ReactionType } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { ReactionBar } from '@/components/feed/reaction-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type FeedPost = Post & { comments?: Comment[] };

function shortId(id: string) {
  return id.slice(0, 2).toUpperCase();
}

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function loadFeed() {
    setLoading(true);
    try {
      const res = await api.getFeed();
      setPosts(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
  }, []);

  async function handlePost() {
    if (!content.trim()) return;
    try {
      const post = (await api.createPost(content, mediaUrl || undefined)) as FeedPost;
      setPosts((prev) => [{ ...post, comments: [] }, ...prev]);
      setContent('');
      setMediaUrl('');
      toast.success('Posted to your network');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create post');
    }
  }

  function handleReactionChange(postId: string, reaction: ReactionType | null) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, viewerReaction: reaction } : p)),
    );
  }

  async function handleRepost(postId: string) {
    try {
      const repost = (await api.repost(postId)) as FeedPost;
      setPosts((prev) => [{ ...repost, comments: [] }, ...prev]);
      toast.success('Reposted to your network');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to repost');
    }
  }

  async function toggleComments(postId: string) {
    if (expanded[postId]) {
      setExpanded((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    try {
      const post = await api.getPost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: post.comments ?? [] } : p)),
      );
      setExpanded((prev) => ({ ...prev, [postId]: true }));
    } catch {
      /* ignore */
    }
  }

  async function submitComment(postId: string) {
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    try {
      const comment = (await api.addComment(postId, text)) as Comment;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...(p.comments ?? []), comment] } : p,
        ),
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      setExpanded((prev) => ({ ...prev, [postId]: true }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add comment');
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display mb-6 text-3xl font-black">Home Feed</h1>

        <Card className="mb-6 p-4">
          <Textarea
            placeholder="Share an update with your network..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <Input
            className="mt-2"
            placeholder="Image URL (optional)"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={loadFeed} disabled={loading}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button onClick={handlePost} disabled={!content.trim()}>
              <Send className="size-4" />
              Post
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </Card>
            ))}

          {!loading && posts.length === 0 && (
            <Card className="p-10 text-center">
              <p className="text-ink/60">
                No posts yet. Connect with others and share your first update.
              </p>
            </Card>
          )}

          {!loading &&
            posts.map((post) => (
              <Card key={post.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback className="bg-secondary text-sm font-semibold text-forest">
                      {shortId(post.authorId)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">
                      {post.authorId.slice(0, 8)}…
                    </p>
                    <p className="text-xs text-ink/50">
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <Link href={`/posts/${post.id}`} className="mt-3 block">
                  <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  {post.mediaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.mediaUrl}
                      alt=""
                      className="mt-3 max-h-72 w-full rounded-xl object-cover"
                    />
                  )}
                </Link>

                <div className="mt-4">
                  <ReactionBar
                    post={post}
                    commentCount={post.comments?.length ?? 0}
                    onToggleComments={() => toggleComments(post.id)}
                    onRepost={() => handleRepost(post.id)}
                    onChange={(r) => handleReactionChange(post.id, r)}
                  />
                </div>

                {expanded[post.id] && (
                  <div className="mt-3">
                    <Separator />
                    <div className="mt-3 space-y-3">
                      {(post.comments ?? []).map((c) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <Avatar size="sm" className="mt-0.5">
                            <AvatarFallback className="bg-muted text-[10px] font-semibold text-ink/70">
                              {shortId(c.authorId)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm text-ink/80">
                            <span className="font-semibold">
                              {c.authorId.slice(0, 8)}…
                            </span>{' '}
                            {c.content}
                          </p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Write a comment..."
                          value={commentDrafts[post.id] ?? ''}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                        />
                        <Button size="sm" onClick={() => submitComment(post.id)}>
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
        </div>
      </main>
    </div>
  );
}
