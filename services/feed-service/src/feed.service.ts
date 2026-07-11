import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import {
  loadConfig,
  getPool,
  KafkaClient,
  RedisCache,
  DomainEvent,
} from '@connectpro/common';

const config = loadConfig('feed-service', 3006);
const FEED_CACHE_TTL = 5 * 60;

interface PostCreatedPayload {
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

@Injectable()
export class FeedService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private kafka: KafkaClient;
  private redis: RedisCache;
  private processedEvents = new Set<string>();

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('feed-service', config.kafkaBrokers);
    this.redis = new RedisCache(config.redisUrl);
  }

  async onModuleInit() {
    await this.redis.connect();
    await this.kafka.subscribe(
      'feed-service',
      ['post-created', 'connection-created', 'user-followed'],
      async (event) => {
        if (event.type === 'post.created') {
          await this.fanoutPost(event as DomainEvent<PostCreatedPayload>);
        }
      },
    );
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
    await this.redis.disconnect();
  }

  private async fanoutPost(event: DomainEvent<PostCreatedPayload>) {
    if (this.processedEvents.has(event.id)) return;
    this.processedEvents.add(event.id);

    const { postId, authorId } = event.payload;
    const score = Date.now();

    // Fanout to author + connections + followers
    const connections = await this.pool.query(
      `SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as user_id
       FROM connections.connections
       WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'accepted'
       UNION SELECT follower_id FROM connections.follows WHERE followee_id = $1`,
      [authorId],
    );

    const recipients = new Set<string>([authorId, ...connections.rows.map((r) => r.user_id)]);

    for (const userId of recipients) {
      await this.pool.query(
        `INSERT INTO posts.home_timeline (user_id, post_id, author_id, score)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [userId, postId, authorId, score],
      );
      await this.redis.del(`feed:${userId}`);
    }
  }

  async getFeed(userId: string, limit = 20) {
    const cacheKey = `feed:${userId}`;
    const cached = await this.redis.get<{ data: unknown[] }>(cacheKey);
    if (cached) return cached;

    const result = await this.pool.query(
      `SELECT p.id, p.author_id, p.content, p.media_url, p.post_type,
              p.like_count, p.created_at, t.score,
              (SELECT COALESCE(jsonb_object_agg(reaction, cnt), '{}'::jsonb)
                 FROM (SELECT reaction, count(*) cnt FROM posts.likes
                       WHERE post_id = p.id GROUP BY reaction) s) as reactions,
              (SELECT reaction FROM posts.likes
                 WHERE post_id = p.id AND user_id = $1) as viewer_reaction
       FROM posts.home_timeline t
       JOIN posts.posts p ON p.id = t.post_id
       WHERE t.user_id = $1 AND p.deleted_at IS NULL
       ORDER BY t.score DESC, p.created_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    const feed = {
      data: result.rows.map((r) => ({
        id: r.id,
        authorId: r.author_id,
        content: r.content,
        mediaUrl: r.media_url,
        postType: r.post_type,
        likeCount: r.like_count,
        reactionCount: r.like_count,
        reactions: r.reactions ?? {},
        viewerReaction: r.viewer_reaction ?? null,
        createdAt: r.created_at,
        score: r.score,
      })),
    };

    await this.redis.set(cacheKey, feed, FEED_CACHE_TTL);
    return feed;
  }

  async getTrending(limit = 20) {
    const result = await this.pool.query(
      `SELECT id, author_id, content, media_url, post_type, like_count, created_at
       FROM posts.posts
       WHERE deleted_at IS NULL
       ORDER BY like_count DESC, created_at DESC
       LIMIT $1`,
      [limit],
    );
    return {
      data: result.rows.map((r) => ({
        id: r.id,
        authorId: r.author_id,
        content: r.content,
        mediaUrl: r.media_url,
        postType: r.post_type,
        likeCount: r.like_count,
        createdAt: r.created_at,
      })),
    };
  }
}
