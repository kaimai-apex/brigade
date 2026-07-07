'use client';

import { useEffect, useState } from 'react';
import { api, type Comment, type Post } from '@/lib/api/client';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type FeedPost = Post & { comments?: Comment[] };

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function loadFeed() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFeed();
      setPosts(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feed');
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create post');
    }
  }

  async function handleLike(postId: string) {
    try {
      await api.likePost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likeCount: p.likeCount + 1 } : p)),
      );
    } catch {
      /* ignore */
    }
  }

  async function toggleComments(postId: string) {
    if (expanded[postId]) {
      setExpanded((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    try {
      const post = await api.getPost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: post.comments ?? [] } : p)));
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
      setError(e instanceof Error ? e.message : 'Failed to add comment');
    }
  }

  return (
    <div className="min-h-screen bg-paper">
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
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button onClick={handlePost} disabled={!content.trim()}>
              Post
            </Button>
          </div>
        </Card>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          {posts.length === 0 && !loading && (
            <p className="text-center opacity-60">
              No posts yet. Connect with others and share your first update.
            </p>
          )}
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <p className="whitespace-pre-wrap">{post.content}</p>
              {post.mediaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.mediaUrl} alt="" className="mt-3 max-h-64 rounded-lg object-cover" />
              )}
              <div className="mt-3 flex items-center gap-4 text-sm opacity-60">
                <button type="button" onClick={() => handleLike(post.id)} className="hover:opacity-100">
                  {post.likeCount} likes
                </button>
                <button type="button" onClick={() => toggleComments(post.id)} className="hover:opacity-100">
                  {(post.comments?.length ?? 0) > 0 ? `${post.comments?.length} comments` : 'Comment'}
                </button>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              {expanded[post.id] && (
                <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
                  {(post.comments ?? []).map((c) => (
                    <p key={c.id} className="text-sm text-ink/75">
                      <span className="font-medium">{c.authorId.slice(0, 8)}…</span> {c.content}
                    </p>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={commentDrafts[post.id] ?? ''}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                    />
                    <Button size="sm" onClick={() => submitComment(post.id)}>
                      Reply
                    </Button>
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
