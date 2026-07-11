import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import {
  loadConfig,
  getPool,
  KafkaClient,
  NotFoundError,
  ForbiddenError,
} from '@connectpro/common';

const config = loadConfig('post-service', 3005);

@Injectable()
export class PostService implements OnModuleDestroy {
  private pool: Pool;
  private kafka: KafkaClient;

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('post-service', config.kafkaBrokers);
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
  }

  async createPost(
    authorId: string,
    content: string,
    mediaUrl?: string,
    postType = 'text',
    visibility = 'public',
    repostedPostId?: string,
  ) {
    const result = await this.pool.query(
      `INSERT INTO posts.posts (author_id, content, media_url, post_type, visibility, reposted_post_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [authorId, content, mediaUrl ?? null, postType, visibility, repostedPostId ?? null],
    );
    const post = result.rows[0];
    await this.kafka.publish('post-created', 'post.created', {
      postId: post.id,
      authorId,
      content,
      createdAt: post.created_at,
    });
    return this.formatPost(post);
  }

  async getPost(postId: string, viewerId?: string) {
    const result = await this.pool.query(
      `SELECT p.*,
         COALESCE(json_agg(jsonb_build_object(
           'id', c.id, 'authorId', c.author_id, 'content', c.content,
           'parentId', c.parent_id, 'createdAt', c.created_at
         ) ORDER BY c.created_at) FILTER (WHERE c.id IS NOT NULL), '[]') as comments,
         (SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb)
            FROM (SELECT reaction, count(*) cnt FROM posts.likes
                  WHERE post_id = p.id GROUP BY reaction) s) as reactions,
         (SELECT reaction FROM posts.likes
            WHERE post_id = p.id AND user_id = $2) as viewer_reaction,
         (SELECT jsonb_build_object(
             'id', o.id, 'authorId', o.author_id, 'content', o.content,
             'mediaUrl', o.media_url, 'createdAt', o.created_at)
            FROM posts.posts o
            WHERE o.id = p.reposted_post_id AND o.deleted_at IS NULL) as reposted_post
       FROM posts.posts p
       LEFT JOIN posts.comments c ON c.post_id = p.id
       WHERE p.id = $1 AND p.deleted_at IS NULL
         AND (
           COALESCE(p.visibility, 'public') = 'public'
           OR p.author_id = $2
         )
       GROUP BY p.id`,
      [postId, viewerId ?? null],
    );
    if (result.rows.length === 0) throw new NotFoundError('Post not found');
    return this.formatPost(result.rows[0]);
  }

  async getPostsByHashtag(tag: string, viewerId?: string) {
    const result = await this.pool.query(
      `SELECT p.id, p.author_id, p.content, p.media_url, p.like_count, p.created_at,
         p.reposted_post_id,
         (SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb)
            FROM (SELECT reaction, count(*) cnt FROM posts.likes
                  WHERE post_id = p.id GROUP BY reaction) s) as reactions,
         (SELECT reaction FROM posts.likes
            WHERE post_id = p.id AND user_id = $2) as viewer_reaction,
         (SELECT jsonb_build_object(
             'id', o.id, 'authorId', o.author_id, 'content', o.content,
             'mediaUrl', o.media_url, 'createdAt', o.created_at)
            FROM posts.posts o
            WHERE o.id = p.reposted_post_id AND o.deleted_at IS NULL) as reposted_post
       FROM posts.posts p
       WHERE p.deleted_at IS NULL AND p.content ILIKE '%#' || $1 || '%'
         AND (
           COALESCE(p.visibility, 'public') = 'public'
           OR p.author_id = $2
         )
       ORDER BY p.created_at DESC LIMIT 50`,
      [tag, viewerId ?? null],
    );
    return {
      tag,
      data: result.rows.map((r) => ({
        id: r.id,
        authorId: r.author_id,
        content: r.content,
        mediaUrl: r.media_url,
        likeCount: r.like_count,
        reactionCount: r.like_count,
        reactions: r.reactions ?? {},
        viewerReaction: r.viewer_reaction ?? null,
        repostedPostId: r.reposted_post_id ?? null,
        repostedPost: r.reposted_post ?? null,
        createdAt: r.created_at,
      })),
    };
  }

  async deletePost(postId: string, userId: string) {
    const result = await this.pool.query(
      `UPDATE posts.posts SET deleted_at = now()
       WHERE id = $1 AND author_id = $2 AND deleted_at IS NULL RETURNING id`,
      [postId, userId],
    );
    if (result.rows.length === 0) throw new ForbiddenError('Post not found or not owned by you');
    return { success: true };
  }

  async addComment(
    postId: string,
    authorId: string,
    content: string,
    parentId?: string,
  ) {
    const postRow = await this.pool.query(
      'SELECT id, author_id FROM posts.posts WHERE id = $1 AND deleted_at IS NULL',
      [postId],
    );
    if (postRow.rows.length === 0) throw new NotFoundError('Post not found');

    const result = await this.pool.query(
      `INSERT INTO posts.comments (post_id, author_id, content, parent_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [postId, authorId, content, parentId ?? null],
    );
    await this.kafka.publish('comment-created', 'comment.created', {
      postId,
      commentId: result.rows[0].id,
      authorId,
      postAuthorId: postRow.rows[0].author_id,
    });
    return {
      id: result.rows[0].id,
      postId,
      authorId,
      content,
      parentId: result.rows[0].parent_id,
      createdAt: result.rows[0].created_at,
    };
  }

  static readonly REACTIONS = [
    'like',
    'celebrate',
    'support',
    'love',
    'insightful',
    'funny',
  ];

  // A user has exactly one reaction per post. Setting a new type updates it in
  // place; like_count only increments on the first reaction (LinkedIn semantics).
  async reactPost(postId: string, userId: string, reaction = 'like') {
    if (!PostService.REACTIONS.includes(reaction)) reaction = 'like';
    const post = await this.pool.query(
      'SELECT author_id FROM posts.posts WHERE id = $1 AND deleted_at IS NULL',
      [postId],
    );
    if (post.rows.length === 0) throw new NotFoundError('Post not found');

    const existing = await this.pool.query(
      'SELECT 1 FROM posts.likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId],
    );
    await this.pool.query(
      `INSERT INTO posts.likes (post_id, user_id, reaction) VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) DO UPDATE SET reaction = $3`,
      [postId, userId, reaction],
    );
    if (existing.rows.length === 0) {
      await this.pool.query(
        'UPDATE posts.posts SET like_count = like_count + 1 WHERE id = $1',
        [postId],
      );
      await this.kafka.publish('post-liked', 'post.liked', {
        postId,
        userId,
        authorId: post.rows[0].author_id,
      });
    }
    return { success: true, reaction };
  }

  // Back-compat: a plain "like" is just the default reaction.
  likePost(postId: string, userId: string) {
    return this.reactPost(postId, userId, 'like');
  }

  async unlikePost(postId: string, userId: string) {
    const result = await this.pool.query(
      'DELETE FROM posts.likes WHERE post_id = $1 AND user_id = $2 RETURNING *',
      [postId, userId],
    );
    if (result.rows.length > 0) {
      await this.pool.query(
        'UPDATE posts.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1',
        [postId],
      );
    }
    return { success: true };
  }

  async sharePost(postId: string, userId: string, quote = '') {
    const original = await this.pool.query(
      'SELECT id FROM posts.posts WHERE id = $1 AND deleted_at IS NULL',
      [postId],
    );
    if (original.rows.length === 0) throw new NotFoundError('Post not found');
    const repost = await this.createPost(userId, quote, undefined, 'repost', 'public', postId);
    await this.kafka.publish('post-shared', 'post.shared', { postId, userId, repostId: repost.id });
    // return the repost with its embedded original
    return this.getPost(String(repost.id), userId);
  }

  private formatPost(row: Record<string, unknown>) {
    return {
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      mediaUrl: row.media_url,
      postType: row.post_type,
      visibility: row.visibility,
      likeCount: row.like_count,
      reactionCount: row.like_count,
      reactions: row.reactions ?? {},
      viewerReaction: row.viewer_reaction ?? null,
      repostedPostId: row.reposted_post_id ?? null,
      repostedPost: row.reposted_post ?? null,
      comments: row.comments ?? [],
      createdAt: row.created_at,
    };
  }
}
