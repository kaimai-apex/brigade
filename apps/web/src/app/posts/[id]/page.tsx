'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Send } from 'lucide-react';
import { api, type Comment, type Post } from '@/lib/api/client';
import { AppPage } from '@/components/layout/app-shell';
import { ReactionBar } from '@/components/feed/reaction-bar';
import { PostContent } from '@/components/feed/post-content';
import { RepostedCard } from '@/components/feed/reposted-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonNames } from '@/hooks/use-person-names';
import { relativeTime } from '@/lib/utils';

type FullPost = Post & { comments?: Comment[] };

function CommentBubble({
  comment,
  name,
  initials,
  small = false,
}: {
  comment: Comment;
  name: string;
  initials: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar size="sm" className={small ? 'size-7' : 'mt-0.5'}>
        <AvatarFallback className="bg-muted text-[10px] font-semibold text-ink/70">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="rounded-lg bg-neutral-50 px-3.5 py-2">
        <Link
          href={`/profile/${comment.authorId}`}
          className="text-[15px] font-semibold hover:underline"
        >
          {name}
        </Link>
        <p className="text-body-md text-ink/80">{comment.content}</p>
      </div>
    </div>
  );
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
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  const personIds = useMemo(() => {
    if (!post) return [];
    const ids = [post.authorId, ...(post.comments ?? []).map((c) => c.authorId)];
    if (post.repostedPost?.authorId) ids.push(post.repostedPost.authorId);
    return ids;
  }, [post]);
  const { label, initialsFor } = usePersonNames(personIds);

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

  async function submitComment(content: string, parentId?: string) {
    const text = content.trim();
    if (!text || !post) return;
    try {
      const comment = await api.addComment(post.id, text, parentId);
      setPost((p) =>
        p ? { ...p, comments: [...(p.comments ?? []), comment] } : p,
      );
      if (parentId) {
        setReplyTo(null);
        setReplyDraft('');
      } else {
        setDraft('');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to comment');
    }
  }

  return (
    <AppPage showAuth={false} mainClassName="py-4">
      <Link
        href="/feed"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink/60 transition hover:text-ink"
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
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-secondary text-sm font-semibold text-forest">
                {initialsFor(post.authorId)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
              <Link
                href={`/profile/${post.authorId}`}
                className="truncate text-[15px] font-semibold hover:underline"
              >
                {label(post.authorId)}
              </Link>
              <p className="shrink-0 text-meta text-ink/50">
                {relativeTime(post.createdAt)}
              </p>
            </div>
          </div>

          {post.content && (
            <p className="mt-3 whitespace-pre-wrap text-body-md">
              <PostContent text={post.content} />
            </p>
          )}
          {post.mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.mediaUrl}
              alt=""
              className="mt-3 max-h-96 w-full rounded-xl object-cover"
            />
          )}
          {post.repostedPost && <RepostedCard post={post.repostedPost} />}

          <div className="mt-4">
            <ReactionBar post={post} commentCount={post.comments?.length ?? 0} />
          </div>

          <Separator className="my-4" />

          <div className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment(draft)}
            />
            <Button onClick={() => submitComment(draft)} disabled={!draft.trim()}>
              <Send className="size-4" />
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            {(() => {
              const all = post.comments ?? [];
              const roots = all.filter((c) => !c.parentId);
              const repliesOf = (pid: string) =>
                all.filter((c) => c.parentId === pid);
              if (all.length === 0) {
                return (
                  <p className="py-2 text-center text-body-md text-ink/50">
                    No comments yet — start the conversation.
                  </p>
                );
              }
              return roots.map((c) => (
                <div key={c.id} className="space-y-2">
                  <CommentBubble
                    comment={c}
                    name={label(c.authorId)}
                    initials={initialsFor(c.authorId)}
                  />
                  <div className="ml-9">
                    <button
                      type="button"
                      onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                      className="text-meta font-semibold text-ink/50 hover:text-ink"
                    >
                      Reply
                    </button>
                    {repliesOf(c.id).map((r) => (
                      <div key={r.id} className="mt-2">
                        <CommentBubble
                          comment={r}
                          name={label(r.authorId)}
                          initials={initialsFor(r.authorId)}
                          small
                        />
                      </div>
                    ))}
                    {replyTo === c.id && (
                      <div className="mt-2 flex gap-2">
                        <Input
                          autoFocus
                          placeholder="Reply…"
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && submitComment(replyDraft, c.id)
                          }
                        />
                        <Button
                          size="sm"
                          onClick={() => submitComment(replyDraft, c.id)}
                          disabled={!replyDraft.trim()}
                        >
                          Reply
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </Card>
      )}
    </AppPage>
  );
}
