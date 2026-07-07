import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KafkaClient, DomainEvent, createLogger } from '@connectpro/common';

const log = createLogger('analytics-service');

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private kafka: KafkaClient;
  private eventCounts: Record<string, number> = {};

  constructor() {
    this.kafka = new KafkaClient(
      'analytics-service',
      (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    );
  }

  async onModuleInit() {
    const topics = [
      'user-created',
      'profile-updated',
      'post-created',
      'post-liked',
      'connection-created',
      'job-applied',
      'message-sent',
    ];
    await this.kafka.subscribe('analytics-service', topics, async (event) => {
      this.eventCounts[event.type] = (this.eventCounts[event.type] ?? 0) + 1;
      log.info({ type: event.type, total: this.eventCounts[event.type] }, 'Event recorded');
    });
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
  }

  getMetrics() {
    return {
      eventCounts: this.eventCounts,
      timestamp: new Date().toISOString(),
    };
  }
}
