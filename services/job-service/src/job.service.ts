import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import {
  loadConfig,
  getPool,
  KafkaClient,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  requireRole,
} from '@connectpro/common';

const config = loadConfig('job-service', 3010);

@Injectable()
export class JobService implements OnModuleDestroy {
  private pool: Pool;
  private kafka: KafkaClient;

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('job-service', config.kafkaBrokers);
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
  }

  async listJobs(filters: { q?: string; location?: string; type?: string }, limit = 20) {
    let query = `SELECT j.*, c.name as company_name FROM jobs.jobs j
                 JOIN jobs.companies c ON c.id = j.company_id
                 WHERE j.deleted_at IS NULL AND j.status = 'open'`;
    const params: unknown[] = [];
    let idx = 1;

    if (filters.q) {
      query += ` AND (j.title ILIKE $${idx} OR j.description ILIKE $${idx})`;
      params.push(`%${filters.q}%`);
      idx++;
    }
    if (filters.location) {
      query += ` AND j.location ILIKE $${idx}`;
      params.push(`%${filters.location}%`);
      idx++;
    }
    if (filters.type) {
      query += ` AND j.employment_type = $${idx}`;
      params.push(filters.type);
      idx++;
    }

    query += ` ORDER BY j.created_at DESC LIMIT $${idx}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return { data: result.rows.map((r) => this.formatJob(r)) };
  }

  async createJob(
    recruiterId: string,
    roles: string[],
    data: {
      companyId: string;
      title: string;
      description?: string;
      location?: string;
      salaryMin?: number;
      salaryMax?: number;
      employmentType?: string;
    },
  ) {
    requireRole({ sub: recruiterId, email: '', roles }, 'RECRUITER', 'COMPANY_ADMIN', 'USER');

    const result = await this.pool.query(
      `INSERT INTO jobs.jobs (company_id, recruiter_id, title, description, location, salary_min, salary_max, employment_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.companyId,
        recruiterId,
        data.title,
        data.description ?? null,
        data.location ?? null,
        data.salaryMin ?? null,
        data.salaryMax ?? null,
        data.employmentType ?? null,
      ],
    );
    const job = result.rows[0];
    await this.kafka.publish('job-created', 'job.created', {
      jobId: job.id,
      title: job.title,
      location: job.location,
      companyId: job.company_id,
    });
    return this.formatJob(job);
  }

  async getJob(jobId: string) {
    const result = await this.pool.query(
      `SELECT j.*, c.name as company_name FROM jobs.jobs j
       JOIN jobs.companies c ON c.id = j.company_id
       WHERE j.id = $1 AND j.deleted_at IS NULL`,
      [jobId],
    );
    if (result.rows.length === 0) throw new NotFoundError('Job not found');
    return this.formatJob(result.rows[0]);
  }

  async apply(jobId: string, userId: string, resumeUrl?: string) {
    const job = await this.pool.query(
      'SELECT recruiter_id FROM jobs.jobs WHERE id = $1 AND deleted_at IS NULL',
      [jobId],
    );
    if (job.rows.length === 0) throw new NotFoundError('Job not found');

    try {
      const result = await this.pool.query(
        `INSERT INTO jobs.applications (job_id, user_id, resume_url)
         VALUES ($1, $2, $3) RETURNING *`,
        [jobId, userId, resumeUrl ?? null],
      );
      await this.kafka.publish('job-applied', 'job.applied', {
        jobId,
        userId,
        applicationId: result.rows[0].id,
        recruiterId: job.rows[0]?.recruiter_id,
      });
      return { id: result.rows[0].id, status: result.rows[0].status };
    } catch {
      throw new ConflictError('Already applied to this job');
    }
  }

  async saveJob(jobId: string, userId: string) {
    const job = await this.pool.query(
      'SELECT id FROM jobs.jobs WHERE id = $1 AND deleted_at IS NULL',
      [jobId],
    );
    if (job.rows.length === 0) throw new NotFoundError('Job not found');

    await this.pool.query(
      `INSERT INTO jobs.saved_jobs (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, jobId],
    );
    return { saved: true };
  }

  async getApplicants(jobId: string, recruiterId: string) {
    const job = await this.pool.query('SELECT recruiter_id FROM jobs.jobs WHERE id = $1', [jobId]);
    if (job.rows.length === 0) throw new NotFoundError('Job not found');
    if (job.rows[0].recruiter_id !== recruiterId) throw new ForbiddenError();

    const result = await this.pool.query(
      'SELECT * FROM jobs.applications WHERE job_id = $1 ORDER BY created_at DESC',
      [jobId],
    );
    return { data: result.rows };
  }

  async updateApplicationStatus(applicationId: string, recruiterId: string, status: string) {
    const app = await this.pool.query(
      `SELECT a.*, j.recruiter_id FROM jobs.applications a
       JOIN jobs.jobs j ON j.id = a.job_id WHERE a.id = $1`,
      [applicationId],
    );
    if (app.rows.length === 0) throw new NotFoundError('Application not found');
    if (app.rows[0].recruiter_id !== recruiterId) throw new ForbiddenError();

    const result = await this.pool.query(
      'UPDATE jobs.applications SET status = $1 WHERE id = $2 RETURNING *',
      [status, applicationId],
    );
    await this.kafka.publish('application-status-changed', 'application.status_changed', {
      applicationId,
      status,
    });
    return result.rows[0];
  }

  private formatJob(row: Record<string, unknown>) {
    return {
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      recruiterId: row.recruiter_id,
      title: row.title,
      description: row.description,
      location: row.location,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      employmentType: row.employment_type,
      status: row.status,
      createdAt: row.created_at,
    };
  }
}
