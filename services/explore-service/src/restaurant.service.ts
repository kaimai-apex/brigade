import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { loadConfig, getPool, NotFoundError, createLogger } from '@connectpro/common';
import { CURATED, type CuratedRestaurant } from './curated';
import {
  fetchOsmRestaurants,
  OSM_ATTRIBUTION,
  type Bbox,
  type OsmRestaurant,
} from './overpass';

const config = loadConfig('explore-service', 3015);
const log = createLogger('explore-service');

/** Coverage freshness — matches the "refresh once a month" cadence. */
const COVERAGE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type ListFilters = {
  bbox?: Bbox;
  cuisine?: string;
  price?: string;
  accolade?: string;
  q?: string;
  page?: number;
  limit?: number;
};

type MergedRecord = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  neighbourhood?: string;
  address?: string;
  city?: string;
  cuisineTags: string[];
  priceLevel?: string;
  accolades: CuratedRestaurant['accolades'];
  website?: string;
  instagram?: string;
  reservationUrl?: string;
  blurb?: string;
  featured: boolean;
  source: 'osm' | 'curated';
  osmType?: string;
  osmId?: number;
  externalUrl?: string;
};

function normName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/['’`]/g, '')
    .replace(/\b(restaurant|the|toronto|kitchen|bar|co|cafe|caf)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const x =
    (((bLng - aLng) * Math.PI) / 180) *
    Math.cos((((aLat + bLat) / 2) * Math.PI) / 180);
  const y = ((bLat - aLat) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * R;
}

function withinBbox(lat: number, lng: number, b: Bbox): boolean {
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

@Injectable()
export class RestaurantService {
  private pool: Pool;

  constructor() {
    this.pool = getPool(config.databaseUrl);
  }

  // ---- Ingestion (OSM + curated overlay → upsert) -------------------------

  /** Merge live OSM with curated accolades for a bbox (server-side twin of the
   *  frontend merge that used to run in the browser). */
  private merge(osm: OsmRestaurant[], bbox: Bbox): MergedRecord[] {
    const curatedInArea = CURATED.filter((c) => withinBbox(c.lat, c.lng, bbox));
    const matched = new Set<string>();

    const records: MergedRecord[] = osm.map((r) => {
      const nn = normName(r.name);
      const hit = curatedInArea.find(
        (c) =>
          !matched.has(c.id) &&
          normName(c.name) === nn &&
          distanceM(r.lat, r.lng, c.lat, c.lng) < 600,
      );
      if (hit) {
        matched.add(hit.id);
        return {
          slug: hit.slug,
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          neighbourhood: hit.neighbourhood ?? r.neighbourhood,
          address: r.address,
          city: r.city,
          cuisineTags: r.cuisineTags.length ? r.cuisineTags : hit.cuisineTags,
          priceLevel: hit.priceLevel,
          accolades: hit.accolades,
          website: r.website ?? hit.website,
          instagram: hit.instagram,
          reservationUrl: hit.reservationUrl,
          blurb: hit.blurb,
          featured: Boolean(hit.featured),
          source: 'curated',
          osmType: r.osmType,
          osmId: r.osmId,
          externalUrl: r.externalUrl,
        };
      }
      return {
        slug: `osm-${r.osmId}`,
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        neighbourhood: r.neighbourhood,
        address: r.address,
        city: r.city,
        cuisineTags: r.cuisineTags,
        accolades: [],
        featured: false,
        source: 'osm',
        osmType: r.osmType,
        osmId: r.osmId,
        externalUrl: r.externalUrl,
      };
    });

    // Curated venues OSM didn't return — keep so accolades never vanish.
    for (const c of curatedInArea) {
      if (matched.has(c.id)) continue;
      records.push({
        slug: c.slug,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        neighbourhood: c.neighbourhood,
        address: c.address,
        cuisineTags: c.cuisineTags,
        priceLevel: c.priceLevel,
        accolades: c.accolades,
        website: c.website,
        instagram: c.instagram,
        reservationUrl: c.reservationUrl,
        blurb: c.blurb,
        featured: Boolean(c.featured),
        source: 'curated',
        externalUrl: c.website,
      });
    }

    return records;
  }

  private async upsert(rec: MergedRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO explore.restaurants
         (slug, name, lat, lng, neighbourhood, address, city, cuisine_tags,
          price_level, accolades, website, instagram, reservation_url, blurb,
          featured, source, osm_type, osm_id, external_url, last_fetched_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19, now(), now())
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         neighbourhood = COALESCE(EXCLUDED.neighbourhood, explore.restaurants.neighbourhood),
         address = COALESCE(EXCLUDED.address, explore.restaurants.address),
         city = COALESCE(EXCLUDED.city, explore.restaurants.city),
         cuisine_tags = EXCLUDED.cuisine_tags,
         price_level = COALESCE(EXCLUDED.price_level, explore.restaurants.price_level),
         accolades = EXCLUDED.accolades,
         website = COALESCE(EXCLUDED.website, explore.restaurants.website),
         instagram = COALESCE(EXCLUDED.instagram, explore.restaurants.instagram),
         reservation_url = COALESCE(EXCLUDED.reservation_url, explore.restaurants.reservation_url),
         blurb = COALESCE(EXCLUDED.blurb, explore.restaurants.blurb),
         featured = EXCLUDED.featured,
         source = EXCLUDED.source,
         osm_type = EXCLUDED.osm_type,
         osm_id = EXCLUDED.osm_id,
         external_url = EXCLUDED.external_url,
         last_fetched_at = now(),
         updated_at = now()`,
      [
        rec.slug,
        rec.name,
        rec.lat,
        rec.lng,
        rec.neighbourhood ?? null,
        rec.address ?? null,
        rec.city ?? null,
        rec.cuisineTags,
        rec.priceLevel ?? null,
        JSON.stringify(rec.accolades ?? []),
        rec.website ?? null,
        rec.instagram ?? null,
        rec.reservationUrl ?? null,
        rec.blurb ?? null,
        rec.featured,
        rec.source,
        rec.osmType ?? null,
        rec.osmId ?? null,
        rec.externalUrl ?? null,
      ],
    );
  }

  /** Pull OSM for a bbox, merge curated, persist, and log coverage. */
  async ingestBbox(bbox: Bbox, label = 'readthrough'): Promise<number> {
    const osm = await fetchOsmRestaurants(bbox);
    const merged = this.merge(osm, bbox);
    for (const rec of merged) {
      await this.upsert(rec);
    }
    await this.pool.query(
      `INSERT INTO explore.ingested_areas
         (label, south, west, north, east, source, restaurant_count)
       VALUES ($1,$2,$3,$4,$5,'osm',$6)`,
      [label, bbox.south, bbox.west, bbox.north, bbox.east, merged.length],
    );
    log.info({ label, count: merged.length, bbox }, 'ingested bbox');
    return merged.length;
  }

  /** Has this bbox been fully covered by a fresh ingest? */
  private async isCovered(bbox: Bbox): Promise<boolean> {
    const cutoff = new Date(Date.now() - COVERAGE_TTL_MS).toISOString();
    const res = await this.pool.query(
      `SELECT 1 FROM explore.ingested_areas
        WHERE south <= $1 AND west <= $2 AND north >= $3 AND east >= $4
          AND ingested_at >= $5
        LIMIT 1`,
      [bbox.south, bbox.west, bbox.north, bbox.east, cutoff],
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---- Query ---------------------------------------------------------------

  async listRestaurants(filters: ListFilters) {
    const page = Math.max(1, filters.page ?? 1);
    // 60 is the directory page size; the map requests up to a few thousand pins.
    const limit = Math.min(3000, Math.max(1, filters.limit ?? 60));
    const offset = (page - 1) * limit;

    // Hybrid read-through: cover the viewport before serving it.
    if (filters.bbox && !(await this.isCovered(filters.bbox))) {
      try {
        await this.ingestBbox(filters.bbox, 'readthrough');
      } catch (err) {
        log.warn({ err: String(err) }, 'read-through ingest failed; serving what we have');
      }
    }

    const where: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (filters.bbox) {
      where.push(
        `lat BETWEEN $${i} AND $${i + 1} AND lng BETWEEN $${i + 2} AND $${i + 3}`,
      );
      params.push(filters.bbox.south, filters.bbox.north, filters.bbox.west, filters.bbox.east);
      i += 4;
    }
    if (filters.cuisine) {
      where.push(`cuisine_tags @> ARRAY[$${i}]::text[]`);
      params.push(filters.cuisine);
      i++;
    }
    if (filters.price) {
      where.push(`price_level = $${i}`);
      params.push(filters.price);
      i++;
    }
    if (filters.accolade) {
      where.push(`accolades @> $${i}::jsonb`);
      params.push(JSON.stringify([{ source: filters.accolade }]));
      i++;
    }
    if (filters.q) {
      where.push(`(name ILIKE $${i} OR neighbourhood ILIKE $${i})`);
      params.push(`%${filters.q}%`);
      i++;
    }

    const whereSql = where.join(' AND ');

    const countRes = await this.pool.query(
      `SELECT count(*)::int AS total FROM explore.restaurants WHERE ${whereSql}`,
      params,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const rows = await this.pool.query(
      `SELECT * FROM explore.restaurants
        WHERE ${whereSql}
        ORDER BY featured DESC, jsonb_array_length(accolades) DESC, name ASC
        LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );

    return {
      data: rows.rows.map((r) => this.format(r)),
      total,
      page,
      limit,
      attribution: OSM_ATTRIBUTION,
    };
  }

  async getBySlug(slug: string) {
    const res = await this.pool.query(
      `SELECT * FROM explore.restaurants WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (!res.rows[0]) throw new NotFoundError('Restaurant not found');
    return this.format(res.rows[0]);
  }

  private format(r: Record<string, unknown>) {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      neighbourhood: r.neighbourhood,
      address: r.address,
      city: r.city,
      cuisineTags: r.cuisine_tags ?? [],
      priceLevel: r.price_level ?? undefined,
      accolades: r.accolades ?? [],
      website: r.website ?? undefined,
      instagram: r.instagram ?? undefined,
      reservationUrl: r.reservation_url ?? undefined,
      blurb: r.blurb ?? undefined,
      featured: Boolean(r.featured),
      source: r.source,
      osmType: r.osm_type ?? undefined,
      osmId: r.osm_id ?? undefined,
      externalUrl: r.external_url ?? undefined,
      claimedByUserId: r.claimed_by_user_id ?? null,
    };
  }
}
