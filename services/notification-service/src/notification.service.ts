import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import {
  loadConfig,
  getPool,
  KafkaClient,
  DomainEvent,
  NotFoundError,
} from '@connectpro/common';

const config = loadConfig('notification-service', 3008);

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private kafka: KafkaClient;
  private processedEvents = new Set<string>();

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('notification-service', config.kafkaBrokers);
  }

  async onModuleInit() {
    await this.kafka.subscribe(
      'notification-service',
      [
        'connection-requested',
        'connection-created',
        'post-liked',
        'comment-created',
        'job-applied',
        'message-sent',
      ],
      async (event) => this.handleEvent(event),
    );
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
  }

  private resolveRecipient(event: DomainEvent): string | null {
    const payload = event.payload as Record<string, unknown>;

    switch (event.type) {
      case 'connection.requested':
        return (payload.receiverId as string) ?? null;
      case 'connection.created':
        return (payload.receiverId as string) ?? null;
      case 'post.liked':
        return (payload.authorId as string) ?? null;
      case 'comment.created':
        return (payload.postAuthorId as string) ?? null;
      case 'job.applied':
        return (payload.recruiterId as string) ?? (payload.posterId as string) ?? null;
      case 'message.sent':
        return (payload.recipientId as string) ?? null;
      default:
        return (payload.receiverId as string) ?? (payload.userId as string) ?? null;
    }
  }

  private async handleEvent(event: DomainEvent) {
    if (this.processedEvents.has(event.id)) return;
    this.processedEvents.add(event.id);

    const typeMap: Record<string, string> = {
      'connection.requested': 'connection_request',
      'connection.created': 'connection_request',
      'post.liked': 'post_like',
      'comment.created': 'comment',
      'job.applied': 'job_match',
      'message.sent': 'message',
    };

    const notifType = typeMap[event.type];
    if (!notifType) return;

    const payload = event.payload as Record<string, unknown>;
    const userId = this.resolveRecipient(event);
    if (!userId) return;

    const actorId =
      (payload.userId as string) ??
      (payload.senderId as string) ??
      (payload.authorId as string);
    if (actorId && actorId === userId) return;

    await this.create(userId, notifType, payload);
  }

  async create(userId: string, type: string, payload: Record<string, unknown>) {
    const prefs = await this.getPreferences(userId);
    if (!prefs.in_app) return;

    const result = await this.pool.query(
      `INSERT INTO notifications.notifications (user_id, type, payload)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, type, JSON.stringify(payload)],
    );
    await this.kafka.publish('notification-created', 'notification.created', {
      notificationId: result.rows[0].id,
      userId,
      type,
    });
    return this.format(result.rows[0]);
  }

  async list(userId: string, limit = 20) {
    const result = await this.pool.query(
      `SELECT * FROM notifications.notifications
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit],
    );
    return { data: result.rows.map((r) => this.format(r)) };
  }

  async markRead(notificationId: string, userId: string) {
    const result = await this.pool.query(
      `UPDATE notifications.notifications SET read_at = now()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId],
    );
    if (result.rows.length === 0) throw new NotFoundError('Notification not found');
    return this.format(result.rows[0]);
  }

  async updatePreferences(
    userId: string,
    prefs: { inApp?: boolean; push?: boolean; email?: boolean; sms?: boolean },
  ) {
    await this.pool.query(
      `INSERT INTO notifications.notification_preferences (user_id, in_app, push, email, sms)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         in_app = COALESCE($2, notifications.notification_preferences.in_app),
         push = COALESCE($3, notifications.notification_preferences.push),
         email = COALESCE($4, notifications.notification_preferences.email),
         sms = COALESCE($5, notifications.notification_preferences.sms)`,
      [
        userId,
        prefs.inApp ?? true,
        prefs.push ?? true,
        prefs.email ?? true,
        prefs.sms ?? false,
      ],
    );
    return this.getPreferences(userId);
  }

  private async getPreferences(userId: string) {
    const result = await this.pool.query(
      'SELECT * FROM notifications.notification_preferences WHERE user_id = $1',
      [userId],
    );
    if (result.rows.length === 0) {
      return { in_app: true, push: true, email: true, sms: false };
    }
    const row = result.rows[0];
    return {
      in_app: row.in_app,
      push: row.push,
      email: row.email,
      sms: row.sms,
    };
  }

  private format(row: Record<string, unknown>) {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  }
}
