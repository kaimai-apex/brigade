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
    ['jobs', []],
    ['posts', []],
  ]);
  private processedEvents = new Set<string>();

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('search-service', config.kafkaBrokers);
  }

  async onModuleInit() {
    await this.kafka.subscribe(
      'search-service',
      ['profile-updated', 'company-created', 'job-created', 'post-created'],
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

    if (event.type === 'post.created') {
      this.upsert('posts', {
        id: payload.postId as string,
        type: 'posts',
        content: payload.content,
        authorId: payload.authorId,
      });
    }

    if (event.type === 'job.created') {
      this.upsert('jobs', {
        id: payload.jobId as string,
        type: 'jobs',
        title: payload.title,
        location: payload.location,
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
    const types = type ? [type] : ['people', 'companies', 'jobs', 'posts'];
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

    for (const docs of this.index.values()) {
      for (const doc of docs) {
        const name = (doc.name as string) ?? (doc.title as string) ?? (doc.content as string)?.slice(0, 50);
        if (name?.toLowerCase().startsWith(query)) {
          suggestions.push(name);
        }
      }
    }

    return { suggestions: [...new Set(suggestions)].slice(0, limit) };
  }
}
