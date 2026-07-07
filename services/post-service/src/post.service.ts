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
  ) {
    const result = await this.pool.query(
      `INSERT INTO posts.posts (author_id, content, media_url, post_type, visibility)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [authorId, content, mediaUrl ?? null, postType, visibility],
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

  async getPost(postId: string) {
    const result = await this.pool.query(
      `SELECT p.*, COALESCE(json_agg(jsonb_build_object(
          'id', c.id, 'authorId', c.author_id, 'content', c.content,
          'createdAt', c.created_at
        )) FILTER (WHERE c.id IS NOT NULL), '[]') as comments
       FROM posts.posts p
       LEFT JOIN posts.comments c ON c.post_id = p.id
       WHERE p.id = $1 AND p.deleted_at IS NULL
       GROUP BY p.id`,
      [postId],
    );
    if (result.rows.length === 0) throw new NotFoundError('Post not found');
    return this.formatPost(result.rows[0]);
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

  async addComment(postId: string, authorId: string, content: string) {
    const postRow = await this.pool.query(
      'SELECT id, author_id FROM posts.posts WHERE id = $1 AND deleted_at IS NULL',
      [postId],
    );
    if (postRow.rows.length === 0) throw new NotFoundError('Post not found');

    const result = await this.pool.query(
      `INSERT INTO posts.comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [postId, authorId, content],
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
      createdAt: result.rows[0].created_at,
    };
  }

  async likePost(postId: string, userId: string) {
    const post = await this.pool.query(
      'SELECT author_id FROM posts.posts WHERE id = $1 AND deleted_at IS NULL',
      [postId],
    );
    if (post.rows.length === 0) throw new NotFoundError('Post not found');

    await this.pool.query(
      `INSERT INTO posts.likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [postId, userId],
    );
    await this.pool.query(
      'UPDATE posts.posts SET like_count = like_count + 1 WHERE id = $1',
      [postId],
    );
    await this.kafka.publish('post-liked', 'post.liked', {
      postId,
      userId,
      authorId: post.rows[0].author_id,
    });
    return { success: true };
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

  async sharePost(postId: string, userId: string) {
    const original = await this.getPost(postId);
    const repost = await this.createPost(
      userId,
      `Shared: ${original.content}`,
      original.mediaUrl as string | undefined,
      'text',
    );
    await this.kafka.publish('post-shared', 'post.shared', { postId, userId, repostId: repost.id });
    return repost;
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
      comments: row.comments ?? [],
      createdAt: row.created_at,
    };
  }
}
