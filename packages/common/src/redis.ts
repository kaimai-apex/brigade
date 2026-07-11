import { createClient, RedisClientType } from 'redis';
import { createLogger } from './logger';

const log = createLogger('redis');

export class RedisCache {
  private client: RedisClientType | null = null;
  private available = false;
  private connectAttempted = false;

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    if (this.connectAttempted) return;
    this.connectAttempted = true;
    try {
      this.client = createClient({
        url: this.url,
        socket: { connectTimeout: 2000, reconnectStrategy: () => false },
      });
      await this.client.connect();
      this.available = true;
    } catch (err) {
      log.warn({ err: String(err) }, 'Redis not available — cache disabled');
      this.client = null;
      this.available = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    await this.connect();
    if (!this.available || !this.client) return null;
    const val = await this.client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.connect();
    if (!this.available || !this.client) return;
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.available || !this.client) return;
    await this.client.del(key);
  }

  // Fire-and-forget pub/sub publish (used to fan realtime events out to SSE).
  async publish(channel: string, message: unknown): Promise<void> {
    await this.connect();
    if (!this.available || !this.client) return;
    try {
      await this.client.publish(channel, JSON.stringify(message));
    } catch (err) {
      log.warn({ err: String(err), channel }, 'Redis publish failed');
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) await this.client.disconnect().catch(() => null);
  }
}
