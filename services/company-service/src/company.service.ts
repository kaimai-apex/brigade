import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { loadConfig, getPool, KafkaClient, NotFoundError } from '@connectpro/common';

const config = loadConfig('company-service', 3011);

@Injectable()
export class CompanyService implements OnModuleDestroy {
  private pool: Pool;
  private kafka: KafkaClient;

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('company-service', config.kafkaBrokers);
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
  }

  async list(limit = 50) {
    const result = await this.pool.query(
      `SELECT c.*,
        (SELECT count(*) FROM jobs.company_followers cf WHERE cf.company_id = c.id) as follower_count
       FROM jobs.companies c
       WHERE c.deleted_at IS NULL
       ORDER BY c.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return { data: result.rows.map((r) => this.format(r)) };
  }

  async create(data: {
    name: string;
    industry?: string;
    website?: string;
    size?: string;
    logoUrl?: string;
  }) {
    const result = await this.pool.query(
      `INSERT INTO jobs.companies (name, industry, website, size, logo_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.name, data.industry ?? null, data.website ?? null, data.size ?? null, data.logoUrl ?? null],
    );
    const company = result.rows[0];
    await this.kafka.publish('company-created', 'company.created', {
      companyId: company.id,
      name: company.name,
    });
    return this.format(company);
  }

  async get(companyId: string) {
    const result = await this.pool.query(
      `SELECT c.*, (SELECT count(*) FROM jobs.company_followers cf WHERE cf.company_id = c.id) as follower_count
       FROM jobs.companies c WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [companyId],
    );
    if (result.rows.length === 0) throw new NotFoundError('Company not found');
    return this.format(result.rows[0]);
  }

  async update(companyId: string, data: { name?: string; industry?: string; website?: string; size?: string; logoUrl?: string }) {
    const result = await this.pool.query(
      `UPDATE jobs.companies SET name = COALESCE($2, name), industry = COALESCE($3, industry),
       website = COALESCE($4, website), size = COALESCE($5, size), logo_url = COALESCE($6, logo_url)
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [companyId, data.name, data.industry, data.website, data.size, data.logoUrl],
    );
    if (result.rows.length === 0) throw new NotFoundError('Company not found');
    return this.format(result.rows[0]);
  }

  async follow(companyId: string, userId: string) {
    await this.pool.query(
      `INSERT INTO jobs.company_followers (company_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [companyId, userId],
    );
    await this.kafka.publish('company-followed', 'company.followed', { companyId, userId });
    return { success: true };
  }

  async analytics(companyId: string) {
    const followers = await this.pool.query(
      'SELECT count(*) FROM jobs.company_followers WHERE company_id = $1',
      [companyId],
    );
    const jobs = await this.pool.query(
      'SELECT count(*) FROM jobs.jobs WHERE company_id = $1 AND deleted_at IS NULL',
      [companyId],
    );
    return {
      companyId,
      followerCount: parseInt(followers.rows[0].count),
      jobCount: parseInt(jobs.rows[0].count),
    };
  }

  private format(row: Record<string, unknown>) {
    return {
      id: row.id,
      name: row.name,
      industry: row.industry,
      website: row.website,
      size: row.size,
      logoUrl: row.logo_url,
      followerCount: row.follower_count,
      createdAt: row.created_at,
    };
  }
}
