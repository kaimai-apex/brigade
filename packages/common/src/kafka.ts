import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { createLogger } from './logger';

const log = createLogger('kafka');

export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  timestamp: string;
  payload: T;
}

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Consumer[] = [];
  private available = false;

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
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.available = true;
      return this.producer;
    } catch (err) {
      log.warn({ err: String(err) }, 'Kafka not available — events disabled');
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

  async subscribe(
    groupId: string,
    topics: string[],
    handler: (event: DomainEvent, payload: EachMessagePayload) => Promise<void>,
  ): Promise<void> {
    try {
      const consumer = this.kafka.consumer({ groupId });
      await consumer.connect();
      await consumer.subscribe({ topics, fromBeginning: false });
      this.consumers.push(consumer);
      this.available = true;

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
    } catch (err) {
      log.warn({ err: String(err), topics }, 'Kafka subscribe failed — consumer disabled');
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer) await this.producer.disconnect().catch(() => null);
    for (const c of this.consumers) await c.disconnect().catch(() => null);
  }
}
