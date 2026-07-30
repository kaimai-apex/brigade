import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { createLogger } from './logger';

const log = createLogger('kafka');

export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  timestamp: string;
  payload: T;
}

/** Backoff between reconnect attempts: 1s doubling to a 30s ceiling. */
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;

function backoff(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Consumer[] = [];
  private available = false;
  /** Set by disconnect(); stops every in-flight reconnect loop. */
  private stopped = false;

  constructor(
    private readonly clientId: string,
    brokers: string[],
  ) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      logLevel: 1,
      connectionTimeout: 3000,
      requestTimeout: 5000,
    });
  }

  private async ensureProducer(): Promise<Producer | null> {
    if (this.producer) return this.producer;
    // Build into a local first: assigning to this.producer before connect()
    // succeeds would cache a dead producer, and every later publish would take
    // the `if (this.producer) return` path and silently drop its event.
    const producer = this.kafka.producer();
    try {
      await producer.connect();
      this.producer = producer;
      this.available = true;
      return producer;
    } catch (err) {
      await producer.disconnect().catch(() => null);
      log.warn({ err: String(err) }, 'Kafka producer unavailable — will retry on next publish');
      return null;
    }
  }

  async publish<T>(topic: string, type: string, payload: T, eventId?: string): Promise<void> {
    const producer = await this.ensureProducer();
    if (!producer) return;

    const event: DomainEvent<T> = {
      id: eventId ?? crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    try {
      await producer.send({
        topic,
        messages: [{ key: event.id, value: JSON.stringify(event) }],
      });
      log.info({ topic, type, eventId: event.id }, 'Event published');
    } catch (err) {
      log.warn({ err: String(err), topic }, 'Kafka publish failed');
    }
  }

  /**
   * Subscribe to `topics`, reconnecting for as long as the process lives.
   *
   * A single failed attempt used to disable the consumer permanently. In
   * practice services start faster than the broker elects a leader, so every
   * service lost its consumer on a cold `docker compose up` and stayed dead
   * until someone restarted it by hand — while producers kept returning 201.
   * Events were accepted and then dropped with no trace.
   *
   * Returns immediately and retries in the background. Callers await this from
   * `onModuleInit`, so it must never block: a broker that is down would
   * otherwise stall Nest's bootstrap and the service would fail its health
   * check instead of simply starting without events for a while.
   */
  async subscribe(
    groupId: string,
    topics: string[],
    handler: (event: DomainEvent, payload: EachMessagePayload) => Promise<void>,
  ): Promise<void> {
    void this.subscribeWithRetry(groupId, topics, handler);
  }

  private async subscribeWithRetry(
    groupId: string,
    topics: string[],
    handler: (event: DomainEvent, payload: EachMessagePayload) => Promise<void>,
  ): Promise<void> {
    const run = async (consumer: Consumer) => {
      await consumer.connect();
      await consumer.subscribe({ topics, fromBeginning: false });
      await consumer.run({
        eachMessage: async (payload) => {
          const { message } = payload;
          if (!message.value) return;
          try {
            const event = JSON.parse(message.value.toString()) as DomainEvent;
            await handler(event, payload);
          } catch (err) {
            log.error({ err, topic: payload.topic }, 'Failed to process message');
          }
        },
      });
    };

    let attempt = 0;
    while (!this.stopped) {
      const consumer = this.kafka.consumer({ groupId });
      try {
        await run(consumer);
        this.consumers.push(consumer);
        this.available = true;
        if (attempt > 0) {
          log.info({ groupId, topics, attempt }, 'Kafka consumer reconnected');
        }

        // kafkajs stops the consumer after an unrecoverable crash. Re-enter the
        // loop rather than leaving the service silently deaf.
        consumer.on(consumer.events.CRASH, ({ payload }) => {
          if (this.stopped) return;
          log.warn({ groupId, topics, err: String(payload.error) }, 'Kafka consumer crashed — resubscribing');
          this.consumers = this.consumers.filter((c) => c !== consumer);
          void this.subscribeWithRetry(groupId, topics, handler);
        });
        return;
      } catch (err) {
        await consumer.disconnect().catch(() => null);
        if (this.stopped) return;
        const wait = backoff(attempt);
        log.warn(
          { err: String(err), groupId, topics, attempt, retryInMs: wait },
          'Kafka subscribe failed — retrying',
        );
        await sleep(wait);
        attempt += 1;
      }
    }
  }

  async disconnect(): Promise<void> {
    this.stopped = true;
    if (this.producer) await this.producer.disconnect().catch(() => null);
    for (const c of this.consumers) await c.disconnect().catch(() => null);
    this.consumers = [];
  }
}
