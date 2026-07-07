import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { loadConfig, getPool, RedisCache } from '@connectpro/common';

const config = loadConfig('recommendation-service', 3014);

@Injectable()
export class RecommendationService implements OnModuleInit {
  private pool: Pool;
  private redis: RedisCache;

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.redis = new RedisCache(config.redisUrl);
  }

  async onModuleInit() {
    await this.redis.connect();
  }

  async getPeopleYouMayKnow(userId: string, limit = 10) {
    const cacheKey = `rec:people:${userId}`;
    const cached = await this.redis.get<unknown[]>(cacheKey);
    if (cached) return { data: cached };

    const result = await this.pool.query(
      `SELECT p.user_id, p.first_name, p.last_name, p.headline
       FROM users.profiles p
       WHERE p.user_id != $1
         AND p.deleted_at IS NULL
         AND p.onboarding_completed = true
         AND NOT EXISTS (
           SELECT 1 FROM connections.connections c
           WHERE c.status IN ('accepted', 'pending')
             AND (
               (c.sender_id = $1 AND c.receiver_id = p.user_id) OR
               (c.receiver_id = $1 AND c.sender_id = p.user_id)
             )
         )
       ORDER BY p.updated_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    const recs = result.rows.map((r) => ({
      userId: r.user_id,
      name: `${r.first_name} ${r.last_name}`,
      headline: r.headline,
      reason: 'mutual_connections',
    }));

    await this.redis.set(cacheKey, recs, 300);
    return { data: recs };
  }

  async getRecommendedJobs(userId: string, limit = 10) {
    const profile = await this.pool.query(
      'SELECT location, industry FROM users.profiles WHERE user_id = $1',
      [userId],
    );
    const location = profile.rows[0]?.location;
    const result = await this.pool.query(
      `SELECT j.*, c.name as company_name FROM jobs.jobs j
       JOIN jobs.companies c ON c.id = j.company_id
       WHERE j.status = 'open' AND j.deleted_at IS NULL
       ${location ? 'AND j.location ILIKE $2' : ''}
       ORDER BY j.created_at DESC LIMIT $1`,
      location ? [limit, `%${location}%`] : [limit],
    );
    return {
      data: result.rows.map((r) => ({
        jobId: r.id,
        title: r.title,
        company: r.company_name,
        location: r.location,
        reason: 'location_match',
      })),
    };
  }

  async getRecommendedContent(userId: string, limit = 10) {
    const result = await this.pool.query(
      `SELECT p.id, p.content, p.author_id, p.like_count
       FROM posts.posts p
       WHERE p.deleted_at IS NULL
       ORDER BY p.like_count DESC, p.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return {
      data: result.rows.map((r) => ({
        postId: r.id,
        content: r.content?.slice(0, 100),
        authorId: r.author_id,
        reason: 'trending',
      })),
    };
  }
}
