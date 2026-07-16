'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api, type Comment, type Post, type ReactionType } from '@/lib/api/client';
import { useAuth } from '@/components/auth/auth-provider';
import { StartPostComposer } from '@/components/feed/start-post-composer';
import { AppPage, useAppUser } from '@/components/layout/app-shell';
import { ReactionBar } from '@/components/feed/reaction-bar';
import { PostContent } from '@/components/feed/post-content';
import { RepostedCard } from '@/components/feed/reposted-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonNames } from '@/hooks/use-person-names';
import { displayName, getInitials, relativeTime } from '@/lib/utils';

type FeedPost = Post & { comments?: Comment[] };

export default function FeedPage() {
  const { session } = useAuth();
  const user = useAppUser(session?.userId);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const personIds = useMemo(() => {
    const ids: string[] = [];
    for (const p of posts) {
      ids.push(p.authorId);
      for (const c of p.comments ?? []) ids.push(c.authorId);
      if (p.repostedPost?.authorId) ids.push(p.repostedPost.authorId);
    }
    return ids;
  }, [posts]);
  const { label, initialsFor } = usePersonNames(personIds);

  async function loadFeed(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await api.getFeed();
      setPosts(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load feed');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
  }, []);

  // Auto-refresh when the tab regains focus
  useEffect(() => {
    function onFocus() {
      void loadFeed({ silent: true });
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  async function handleCreatePost(content: string, mediaUrl?: string) {
    const post = (await api.createPost(content, mediaUrl)) as FeedPost;
    setPosts((prev) => [{ ...post, comments: [] }, ...prev]);
    void loadFeed({ silent: true });
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
      toast.success('Reposted to the feed');
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
    <AppPage showAuth={false} mainClassName="py-4">
      <h1 className="sr-only">Feed</h1>

      <StartPostComposer
        className="mb-3"
        userName={user ? displayName(user.firstName, user.lastName) : 'Member'}
        userInitials={getInitials(user?.firstName, user?.lastName)}
        avatarUrl={user?.avatarUrl}
        avatarSeed={session?.userId}
        onPost={handleCreatePost}
      />

      <div className="space-y-3">
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
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero/chef-cook.jpg"
              alt=""
              className="h-28 w-28 rounded-2xl object-cover mix-blend-multiply"
            />
            <p className="text-section-title">Your feed is quiet</p>
            <p className="text-body-md text-ink/65">
              Follow people to fill your feed with what&apos;s happening in hospitality.
            </p>
            <Button asChild className="mt-1 w-full max-w-xs">
              <Link href="/discover">Find people</Link>
            </Button>
          </Card>
        )}

        {!loading &&
          posts.map((post) => (
            <Card key={post.id} className="rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Link href={`/profile/${post.authorId}`}>
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-secondary text-sm font-semibold text-forest">
                      {initialsFor(post.authorId)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                  <Link
                    href={`/profile/${post.authorId}`}
                    className="truncate text-[15px] font-semibold hover:underline"
                  >
                    {label(post.authorId)}
                  </Link>
                  <Link
                    href={`/posts/${post.id}`}
                    className="shrink-0 text-meta text-ink/50 hover:underline"
                  >
                    {post.repostedPost && 'reposted · '}
                    {relativeTime(post.createdAt)}
                  </Link>
                </div>
              </div>

              <div className="mt-3">
                {post.content && (
                  <p className="text-body-md whitespace-pre-wrap">
                    <PostContent text={post.content} />
                  </p>
                )}
                {post.mediaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.mediaUrl}
                    alt=""
                    className="mt-3 max-h-72 w-full rounded-xl object-cover"
                  />
                )}
                {post.repostedPost && <RepostedCard post={post.repostedPost} />}
              </div>

              <div className="mt-3">
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
                            {initialsFor(c.authorId)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-body-md text-ink/80">
                          <span className="font-semibold">{label(c.authorId)}</span>{' '}
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
    </AppPage>
  );
}
