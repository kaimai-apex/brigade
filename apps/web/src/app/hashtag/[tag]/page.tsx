'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Hash } from 'lucide-react';
import { api, type Post } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { ReactionBar } from '@/components/feed/reaction-bar';
import { PostContent } from '@/components/feed/post-content';
import { RepostedCard } from '@/components/feed/reposted-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function shortId(id: string) {
  return id.slice(0, 2).toUpperCase();
}

export default function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = use(params);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .getPostsByHashtag(tag)
      .then((res) => active && setPosts(res.data ?? []))
      .catch(() => active && setPosts([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tag]);

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
            <Hash className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-black leading-none">
              #{tag}
            </h1>
            <p className="text-sm text-ink/55">
              {loading ? '…' : `${posts.length} post${posts.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-4 w-full" />
              </Card>
            ))}

          {!loading && posts.length === 0 && (
            <Card className="p-10 text-center text-ink/60">
              No posts tagged <span className="font-semibold">#{tag}</span> yet.
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
                    <Link
                      href={`/profile/${post.authorId}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {post.authorId.slice(0, 8)}…
                    </Link>
                    <Link
                      href={`/posts/${post.id}`}
                      className="block text-xs text-ink/50 hover:underline"
                    >
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Link>
                  </div>
                </div>

                <div className="mt-3">
                  {post.content && (
                    <p className="whitespace-pre-wrap leading-relaxed">
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

                <div className="mt-4">
                  <ReactionBar post={post} commentCount={0} />
                </div>
              </Card>
            ))}
        </div>
      </main>
    </div>
  );
}
