import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import {
  loadConfig,
  getPool,
  KafkaClient,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '@connectpro/common';

const config = loadConfig('connection-service', 3004);

@Injectable()
export class ConnectionService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private kafka: KafkaClient;

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('connection-service', config.kafkaBrokers);
  }

  async onModuleInit() {}
  async onModuleDestroy() {
    await this.kafka.disconnect();
  }

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) throw new ConflictError('Cannot connect with yourself');
    const existing = await this.pool.query(
      `SELECT id, status FROM connections.connections
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [senderId, receiverId],
    );
    if (existing.rows.length > 0) {
      throw new ConflictError('Connection already exists', { status: existing.rows[0].status });
    }
    const result = await this.pool.query(
      `INSERT INTO connections.connections (sender_id, receiver_id, status)
       VALUES ($1, $2, 'pending') RETURNING *`,
      [senderId, receiverId],
    );
    return this.formatConnection(result.rows[0]);
  }

  async accept(connectionId: string, userId: string) {
    const result = await this.pool.query(
      `UPDATE connections.connections SET status = 'accepted', updated_at = now()
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending' RETURNING *`,
      [connectionId, userId],
    );
    if (result.rows.length === 0) throw new NotFoundError('Connection request not found');
    const conn = result.rows[0];
    await this.kafka.publish('connection-created', 'connection.created', {
      connectionId: conn.id,
      senderId: conn.sender_id,
      receiverId: conn.receiver_id,
    });
    return this.formatConnection(conn);
  }

  async reject(connectionId: string, userId: string) {
    const result = await this.pool.query(
      `UPDATE connections.connections SET status = 'rejected', updated_at = now()
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending' RETURNING *`,
      [connectionId, userId],
    );
    if (result.rows.length === 0) throw new NotFoundError('Connection request not found');
    return this.formatConnection(result.rows[0]);
  }

  async remove(connectionId: string, userId: string) {
    const result = await this.pool.query(
      `DELETE FROM connections.connections
       WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2) RETURNING *`,
      [connectionId, userId],
    );
    if (result.rows.length === 0) throw new NotFoundError('Connection not found');
    await this.kafka.publish('connection-removed', 'connection.removed', {
      connectionId,
      userId,
    });
    return { success: true };
  }

  async listConnections(userId: string, status = 'accepted') {
    const result = await this.pool.query(
      `SELECT * FROM connections.connections
       WHERE (sender_id = $1 OR receiver_id = $1) AND status = $2
       ORDER BY updated_at DESC`,
      [userId, status],
    );
    return { data: result.rows.map((r) => this.formatConnection(r)) };
  }

  async follow(followerId: string, followeeId: string) {
    if (followerId === followeeId) throw new ConflictError('Cannot follow yourself');
    await this.pool.query(
      `INSERT INTO connections.follows (follower_id, followee_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [followerId, followeeId],
    );
    await this.kafka.publish('user-followed', 'user.followed', { followerId, followeeId });
    return { success: true };
  }

  async unfollow(followerId: string, followeeId: string) {
    await this.pool.query(
      'DELETE FROM connections.follows WHERE follower_id = $1 AND followee_id = $2',
      [followerId, followeeId],
    );
    return { success: true };
  }

  private formatConnection(row: Record<string, unknown>) {
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
