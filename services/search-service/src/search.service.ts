import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { loadConfig, getPool, KafkaClient, DomainEvent } from '@connectpro/common';

const config = loadConfig('search-service', 3009);
const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? 'http://localhost:9200';

interface SearchDocument {
  id: string;
  type: string;
  [key: string]: unknown;
}

@Injectable()
export class SearchService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private kafka: KafkaClient;
  private index: Map<string, SearchDocument[]> = new Map([
    ['people', []],
    ['companies', []],
  ]);
  private processedEvents = new Set<string>();

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('search-service', config.kafkaBrokers);
  }

  async onModuleInit() {
    await this.kafka.subscribe(
      'search-service',
      ['profile-updated', 'company-created'],
      async (event) => this.indexEvent(event),
    );
    await this.bootstrapIndexes();
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
  }

  private async bootstrapIndexes() {
    const profiles = await this.pool.query(
      'SELECT user_id, first_name, last_name, headline, location, industry FROM users.profiles WHERE deleted_at IS NULL LIMIT 1000',
    );
    for (const p of profiles.rows) {
      this.upsert('people', {
        id: p.user_id,
        type: 'people',
        name: `${p.first_name} ${p.last_name}`,
        headline: p.headline,
        location: p.location,
        industry: p.industry,
      });
    }

    try {
      const companies = await this.pool.query(
        'SELECT id, name, slug, industry FROM jobs.companies WHERE deleted_at IS NULL LIMIT 1000',
      );
      for (const c of companies.rows) {
        this.upsert('companies', {
          id: c.id,
          type: 'companies',
          name: c.name,
          slug: c.slug,
          industry: c.industry,
        });
      }
    } catch {
      /* companies table may not exist in some envs */
    }
  }

  private async indexEvent(event: DomainEvent) {
    if (this.processedEvents.has(event.id)) return;
    this.processedEvents.add(event.id);

    const payload = event.payload as Record<string, unknown>;

    if (event.type === 'profile.updated') {
      const profile = await this.pool.query(
        'SELECT * FROM users.profiles WHERE user_id = $1',
        [payload.userId],
      );
      if (profile.rows.length > 0) {
        const p = profile.rows[0];
        this.upsert('people', {
          id: p.user_id,
          type: 'people',
          name: `${p.first_name} ${p.last_name}`,
          headline: p.headline,
          location: p.location,
          industry: p.industry,
        });
      }
    }

    // People + companies only (product redesign). Ignore posts/jobs/messages.

    if (event.type === 'company.created') {
      this.upsert('companies', {
        id: (payload.companyId as string) ?? (payload.id as string),
        type: 'companies',
        name: payload.name,
        slug: payload.slug,
      });
    }
  }

  private upsert(indexName: string, doc: SearchDocument) {
    const docs = this.index.get(indexName) ?? [];
    const idx = docs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) docs[idx] = doc;
    else docs.push(doc);
    this.index.set(indexName, docs);
  }

  async search(q: string, type?: string, limit = 20): Promise<{ data: Record<string, unknown>[]; query: string }> {
    const query = q.toLowerCase();
    // Map legacy client types → people/companies only
    const normalized = type === 'user' || type === 'person' ? 'people' : type === 'company' ? 'companies' : type;
    const types = normalized
      ? [normalized].filter((t) => t === 'people' || t === 'companies')
      : ['people', 'companies'];
    const results: SearchDocument[] = [];

    for (const t of types) {
      const docs = this.index.get(t) ?? [];
      for (const doc of docs) {
        const haystack = JSON.stringify(doc).toLowerCase();
        if (haystack.includes(query)) {
          results.push(doc);
        }
      }
    }

    return { data: results.slice(0, limit), query: q };
  }

  async autocomplete(q: string, limit = 10) {
    const query = q.toLowerCase();
    const suggestions: string[] = [];

    for (const key of ['people', 'companies'] as const) {
      const docs = this.index.get(key) ?? [];
      for (const doc of docs) {
        const name = (doc.name as string) ?? (doc.title as string);
        if (name?.toLowerCase().startsWith(query)) {
          suggestions.push(name);
        }
      }
    }

    return { suggestions: [...new Set(suggestions)].slice(0, limit) };
  }
}
