import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { loadConfig, getPool, NotFoundError, createLogger } from '@connectpro/common';
import {
  SCHOOLS,
  ASSOCIATIONS,
  SUPPLIERS,
  NEWS,
  JOBS,
  NEIGHBOURHOODS,
} from './curated-directory';
import type { Bbox } from './overpass';

const config = loadConfig('explore-service', 3015);
const log = createLogger('explore-service');

const TABLE_WHITELIST = {
  schools: true,
  associations: true,
  suppliers: true,
  news_items: true,
  job_listings: true,
  neighbourhoods: true,
} as const;

type ListOpts = {
  bbox?: Bbox;
  q?: string;
  page?: number;
  limit?: number;
  // entity-specific
  city?: string;
  program?: string;
  scope?: string;
  category?: string;
  region?: string;
  tag?: string;
  type?: string;
  neighbourhood?: string;
  employment?: string;
};

@Injectable()
export class DirectoryService {
  private pool: Pool;
  private seeding: Promise<Record<string, number>> | null = null;

  constructor() {
    this.pool = getPool(config.databaseUrl);
  }

  /** Upsert all curated directory entities. Idempotent. */
  async seedAll(): Promise<Record<string, number>> {
    if (this.seeding) return this.seeding;
    this.seeding = this.runSeed().finally(() => {
      this.seeding = null;
    });
    return this.seeding;
  }

  private async runSeed(): Promise<Record<string, number>> {
    const counts = {
      schools: 0,
      associations: 0,
      suppliers: 0,
      news: 0,
      jobListings: 0,
      neighbourhoods: 0,
    };

    for (const n of NEIGHBOURHOODS) {
      await this.pool.query(
        `INSERT INTO explore.neighbourhoods (slug, name, lat, lng, updated_at)
         VALUES ($1,$2,$3,$4, now())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name, lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = now()`,
        [n.slug, n.name, n.lat, n.lng],
      );
      counts.neighbourhoods++;
    }

    for (const s of SCHOOLS) {
      await this.pool.query(
        `INSERT INTO explore.schools
           (slug, name, city, lat, lng, programs, credential, website, blurb, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name, city = EXCLUDED.city, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
           programs = EXCLUDED.programs, credential = EXCLUDED.credential,
           website = EXCLUDED.website, blurb = EXCLUDED.blurb, updated_at = now()`,
        [s.slug, s.name, s.city, s.lat, s.lng, s.programs, s.credential, s.website, s.blurb],
      );
      counts.schools++;
    }

    for (const a of ASSOCIATIONS) {
      await this.pool.query(
        `INSERT INTO explore.associations
           (slug, name, acronym, scope, website, role, blurb, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name, acronym = EXCLUDED.acronym, scope = EXCLUDED.scope,
           website = EXCLUDED.website, role = EXCLUDED.role, blurb = EXCLUDED.blurb,
           updated_at = now()`,
        [a.slug, a.name, a.acronym ?? null, a.scope, a.website, a.role, a.blurb],
      );
      counts.associations++;
    }

    for (const s of SUPPLIERS) {
      await this.pool.query(
        `INSERT INTO explore.suppliers
           (slug, name, categories, regions_served, website, phone, lat, lng,
            description, claimed, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name, categories = EXCLUDED.categories,
           regions_served = EXCLUDED.regions_served, website = EXCLUDED.website,
           phone = EXCLUDED.phone, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
           description = EXCLUDED.description, claimed = EXCLUDED.claimed,
           updated_at = now()`,
        [
          s.slug,
          s.name,
          s.categories,
          s.regionsServed,
          s.website,
          s.phone ?? null,
          s.lat ?? null,
          s.lng ?? null,
          s.description,
          Boolean(s.claimed),
        ],
      );
      counts.suppliers++;
    }

    for (const n of NEWS) {
      await this.pool.query(
        `INSERT INTO explore.news_items
           (slug, title, snippet, source_name, source_url, url, published_at, tags, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title, snippet = EXCLUDED.snippet,
           source_name = EXCLUDED.source_name, source_url = EXCLUDED.source_url,
           url = EXCLUDED.url, published_at = EXCLUDED.published_at,
           tags = EXCLUDED.tags, updated_at = now()`,
        [n.slug, n.title, n.snippet, n.source, n.sourceUrl, n.url, n.publishedAt, n.tags],
      );
      counts.news++;
    }

    for (const j of JOBS) {
      const nb = NEIGHBOURHOODS.find(
        (n) => n.name.toLowerCase() === j.neighbourhood.toLowerCase(),
      );
      await this.pool.query(
        `INSERT INTO explore.job_listings
           (slug, title, employer, neighbourhood, job_type, employment, compensation,
            source_name, url, posted_at, lat, lng, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title, employer = EXCLUDED.employer,
           neighbourhood = EXCLUDED.neighbourhood, job_type = EXCLUDED.job_type,
           employment = EXCLUDED.employment, compensation = EXCLUDED.compensation,
           source_name = EXCLUDED.source_name, url = EXCLUDED.url,
           posted_at = EXCLUDED.posted_at, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
           updated_at = now()`,
        [
          j.slug,
          j.title,
          j.employer,
          j.neighbourhood,
          j.type,
          j.employment,
          j.compensation ?? null,
          j.source,
          j.url,
          j.postedAt,
          nb?.lat ?? null,
          nb?.lng ?? null,
        ],
      );
      counts.jobListings++;
    }

    log.info(counts, 'seeded explore directory');
    return counts;
  }

  /** If a table is empty, seed everything once (read-through for curated data). */
  private async ensureSeeded(table: keyof typeof TABLE_WHITELIST): Promise<void> {
    if (!TABLE_WHITELIST[table]) throw new Error(`unknown explore table: ${table}`);
    const res = await this.pool.query(
      `SELECT 1 FROM explore.${table} WHERE deleted_at IS NULL LIMIT 1`,
    );
    if ((res.rowCount ?? 0) === 0) {
      await this.seedAll();
    }
  }

  private pageLimit(opts: ListOpts) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
    return { page, limit, offset: (page - 1) * limit };
  }

  // ---- Schools -------------------------------------------------------------

  async listSchools(opts: ListOpts = {}) {
    await this.ensureSeeded('schools');
    const { page, limit, offset } = this.pageLimit(opts);
    const where: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (opts.bbox) {
      where.push(
        `lat BETWEEN $${i} AND $${i + 1} AND lng BETWEEN $${i + 2} AND $${i + 3}`,
      );
      params.push(opts.bbox.south, opts.bbox.north, opts.bbox.west, opts.bbox.east);
      i += 4;
    }
    if (opts.city) {
      where.push(`city ILIKE $${i}`);
      params.push(opts.city);
      i++;
    }
    if (opts.program) {
      where.push(`programs @> ARRAY[$${i}]::text[]`);
      params.push(opts.program);
      i++;
    }
    if (opts.q) {
      where.push(`(name ILIKE $${i} OR city ILIKE $${i} OR blurb ILIKE $${i})`);
      params.push(`%${opts.q}%`);
      i++;
    }

    const whereSql = where.join(' AND ');
    const countRes = await this.pool.query(
      `SELECT count(*)::int AS total FROM explore.schools WHERE ${whereSql}`,
      params,
    );
    const rows = await this.pool.query(
      `SELECT * FROM explore.schools WHERE ${whereSql} ORDER BY name ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );
    return {
      data: rows.rows.map((r) => this.formatSchool(r)),
      total: countRes.rows[0]?.total ?? 0,
      page,
      limit,
    };
  }

  async getSchool(slug: string) {
    await this.ensureSeeded('schools');
    const res = await this.pool.query(
      `SELECT * FROM explore.schools WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (!res.rows[0]) throw new NotFoundError('School not found');
    return this.formatSchool(res.rows[0]);
  }

  private formatSchool(r: Record<string, unknown>) {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      city: r.city,
      lat: r.lat,
      lng: r.lng,
      programs: r.programs ?? [],
      credential: r.credential,
      website: r.website,
      blurb: r.blurb,
      claimedByUserId: r.claimed_by_user_id ?? null,
    };
  }

  // ---- Associations --------------------------------------------------------

  async listAssociations(opts: ListOpts = {}) {
    await this.ensureSeeded('associations');
    const { page, limit, offset } = this.pageLimit(opts);
    const where: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (opts.scope) {
      where.push(`scope = $${i}`);
      params.push(opts.scope);
      i++;
    }
    if (opts.q) {
      where.push(
        `(name ILIKE $${i} OR COALESCE(acronym,'') ILIKE $${i} OR blurb ILIKE $${i})`,
      );
      params.push(`%${opts.q}%`);
      i++;
    }

    const whereSql = where.join(' AND ');
    const countRes = await this.pool.query(
      `SELECT count(*)::int AS total FROM explore.associations WHERE ${whereSql}`,
      params,
    );
    const rows = await this.pool.query(
      `SELECT * FROM explore.associations WHERE ${whereSql} ORDER BY name ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );
    return {
      data: rows.rows.map((r) => this.formatAssociation(r)),
      total: countRes.rows[0]?.total ?? 0,
      page,
      limit,
    };
  }

  private formatAssociation(r: Record<string, unknown>) {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      acronym: r.acronym ?? undefined,
      scope: r.scope,
      website: r.website,
      role: r.role,
      blurb: r.blurb,
    };
  }

  // ---- Suppliers -----------------------------------------------------------

  async listSuppliers(opts: ListOpts = {}) {
    await this.ensureSeeded('suppliers');
    const { page, limit, offset } = this.pageLimit(opts);
    const where: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (opts.bbox) {
      where.push(
        `lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN $${i} AND $${i + 1} AND lng BETWEEN $${i + 2} AND $${i + 3}`,
      );
      params.push(opts.bbox.south, opts.bbox.north, opts.bbox.west, opts.bbox.east);
      i += 4;
    }
    if (opts.category) {
      where.push(`categories @> ARRAY[$${i}]::text[]`);
      params.push(opts.category);
      i++;
    }
    if (opts.region) {
      where.push(`regions_served @> ARRAY[$${i}]::text[]`);
      params.push(opts.region);
      i++;
    }
    if (opts.q) {
      where.push(`(name ILIKE $${i} OR description ILIKE $${i})`);
      params.push(`%${opts.q}%`);
      i++;
    }

    const whereSql = where.join(' AND ');
    const countRes = await this.pool.query(
      `SELECT count(*)::int AS total FROM explore.suppliers WHERE ${whereSql}`,
      params,
    );
    const rows = await this.pool.query(
      `SELECT * FROM explore.suppliers WHERE ${whereSql} ORDER BY name ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );
    return {
      data: rows.rows.map((r) => this.formatSupplier(r)),
      total: countRes.rows[0]?.total ?? 0,
      page,
      limit,
    };
  }

  private formatSupplier(r: Record<string, unknown>) {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      categories: r.categories ?? [],
      regionsServed: r.regions_served ?? [],
      website: r.website,
      phone: r.phone ?? undefined,
      lat: r.lat ?? undefined,
      lng: r.lng ?? undefined,
      description: r.description,
      claimed: Boolean(r.claimed),
      claimedByUserId: r.claimed_by_user_id ?? null,
    };
  }

  // ---- News ----------------------------------------------------------------

  async listNews(opts: ListOpts = {}) {
    await this.ensureSeeded('news_items');
    const { page, limit, offset } = this.pageLimit(opts);
    const where: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (opts.tag) {
      where.push(`tags @> ARRAY[$${i}]::text[]`);
      params.push(opts.tag);
      i++;
    }
    if (opts.q) {
      where.push(
        `(title ILIKE $${i} OR snippet ILIKE $${i} OR source_name ILIKE $${i})`,
      );
      params.push(`%${opts.q}%`);
      i++;
    }

    const whereSql = where.join(' AND ');
    const countRes = await this.pool.query(
      `SELECT count(*)::int AS total FROM explore.news_items WHERE ${whereSql}`,
      params,
    );
    const rows = await this.pool.query(
      `SELECT * FROM explore.news_items WHERE ${whereSql}
       ORDER BY published_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );
    return {
      data: rows.rows.map((r) => this.formatNews(r)),
      total: countRes.rows[0]?.total ?? 0,
      page,
      limit,
    };
  }

  private formatNews(r: Record<string, unknown>) {
    return {
      id: r.id,
      title: r.title,
      snippet: r.snippet,
      source: r.source_name,
      sourceUrl: r.source_url,
      url: r.url,
      publishedAt:
        r.published_at instanceof Date
          ? r.published_at.toISOString()
          : String(r.published_at),
      tags: r.tags ?? [],
    };
  }

  // ---- Job listings (explore link-outs) ------------------------------------

  async listJobListings(opts: ListOpts = {}) {
    await this.ensureSeeded('job_listings');
    const { page, limit, offset } = this.pageLimit(opts);
    const where: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (opts.bbox) {
      where.push(
        `lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN $${i} AND $${i + 1} AND lng BETWEEN $${i + 2} AND $${i + 3}`,
      );
      params.push(opts.bbox.south, opts.bbox.north, opts.bbox.west, opts.bbox.east);
      i += 4;
    }
    if (opts.type) {
      where.push(`job_type = $${i}`);
      params.push(opts.type);
      i++;
    }
    if (opts.neighbourhood) {
      where.push(`neighbourhood ILIKE $${i}`);
      params.push(opts.neighbourhood);
      i++;
    }
    if (opts.employment) {
      where.push(`employment ILIKE $${i}`);
      params.push(opts.employment);
      i++;
    }
    if (opts.q) {
      where.push(
        `(title ILIKE $${i} OR employer ILIKE $${i} OR neighbourhood ILIKE $${i})`,
      );
      params.push(`%${opts.q}%`);
      i++;
    }

    const whereSql = where.join(' AND ');
    const countRes = await this.pool.query(
      `SELECT count(*)::int AS total FROM explore.job_listings WHERE ${whereSql}`,
      params,
    );
    const rows = await this.pool.query(
      `SELECT * FROM explore.job_listings WHERE ${whereSql}
       ORDER BY posted_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );
    return {
      data: rows.rows.map((r) => this.formatJob(r)),
      total: countRes.rows[0]?.total ?? 0,
      page,
      limit,
    };
  }

  private formatJob(r: Record<string, unknown>) {
    return {
      id: r.id,
      title: r.title,
      employer: r.employer,
      neighbourhood: r.neighbourhood,
      type: r.job_type,
      employment: r.employment,
      compensation: r.compensation ?? undefined,
      source: r.source_name,
      url: r.url,
      postedAt:
        r.posted_at instanceof Date ? r.posted_at.toISOString() : String(r.posted_at),
      lat: r.lat ?? undefined,
      lng: r.lng ?? undefined,
    };
  }

  // ---- Neighbourhoods ------------------------------------------------------

  async listNeighbourhoods(opts: ListOpts = {}) {
    await this.ensureSeeded('neighbourhoods');
    const { page, limit, offset } = this.pageLimit(opts);
    const where: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (opts.bbox) {
      where.push(
        `lat BETWEEN $${i} AND $${i + 1} AND lng BETWEEN $${i + 2} AND $${i + 3}`,
      );
      params.push(opts.bbox.south, opts.bbox.north, opts.bbox.west, opts.bbox.east);
      i += 4;
    }
    if (opts.q) {
      where.push(`name ILIKE $${i}`);
      params.push(`%${opts.q}%`);
      i++;
    }

    const whereSql = where.join(' AND ');
    const countRes = await this.pool.query(
      `SELECT count(*)::int AS total FROM explore.neighbourhoods WHERE ${whereSql}`,
      params,
    );
    const rows = await this.pool.query(
      `SELECT * FROM explore.neighbourhoods WHERE ${whereSql} ORDER BY name ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );
    return {
      data: rows.rows.map((r) => ({
        slug: r.slug as string,
        name: r.name as string,
        lat: r.lat as number,
        lng: r.lng as number,
      })),
      total: countRes.rows[0]?.total ?? 0,
      page,
      limit,
    };
  }

  /** Map pins for schools + suppliers + jobs inside a bbox. */
  async mapPins(bbox?: Bbox) {
    await this.ensureSeeded('schools');
    const [schools, suppliers, jobs] = await Promise.all([
      this.listSchools({ bbox, limit: 500 }),
      this.listSuppliers({ bbox, limit: 500 }),
      this.listJobListings({ bbox, limit: 500 }),
    ]);

    const pins: Array<{
      id: string;
      layer: 'schools' | 'suppliers' | 'jobs';
      name: string;
      lat: number;
      lng: number;
      href: string;
      meta?: string;
    }> = [];

    for (const s of schools.data) {
      pins.push({
        id: String(s.id),
        layer: 'schools',
        name: String(s.name),
        lat: Number(s.lat),
        lng: Number(s.lng),
        href: '/explore/resources',
        meta: String(s.city),
      });
    }
    for (const s of suppliers.data) {
      if (s.lat == null || s.lng == null) continue;
      pins.push({
        id: String(s.id),
        layer: 'suppliers',
        name: String(s.name),
        lat: Number(s.lat),
        lng: Number(s.lng),
        href: '/explore/suppliers',
        meta: (s.categories as string[]).join(' · '),
      });
    }
    for (const j of jobs.data) {
      if (j.lat == null || j.lng == null) continue;
      pins.push({
        id: String(j.id),
        layer: 'jobs',
        name: `${j.title} — ${j.employer}`,
        lat: Number(j.lat),
        lng: Number(j.lng),
        href: '/explore/jobs',
        meta: String(j.neighbourhood),
      });
    }
    return { data: pins, total: pins.length };
  }
}
