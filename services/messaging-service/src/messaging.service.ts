import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db, ObjectId } from 'mongodb';
import {
  loadConfig,
  KafkaClient,
  RedisCache,
  NotFoundError,
  ForbiddenError,
} from '@connectpro/common';

const config = loadConfig('messaging-service', 3007);
const MONGO_URL = process.env.MONGO_URL ?? 'mongodb://localhost:27017/connectpro';

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private kafka: KafkaClient;
  private redis: RedisCache;

  constructor() {
    this.kafka = new KafkaClient('messaging-service', config.kafkaBrokers);
    this.redis = new RedisCache(config.redisUrl);
  }

  async onModuleInit() {
    this.client = new MongoClient(MONGO_URL);
    await this.client.connect();
    this.db = this.client.db('connectpro');
    await this.db.collection('conversations').createIndex({ participants: 1 });
    await this.db.collection('messages').createIndex({ conversationId: 1, createdAt: -1 });
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
    await this.redis.disconnect();
    if (this.client) await this.client.close();
  }

  async listConversations(userId: string) {
    const conversations = await this.db!.collection('conversations')
      .find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .toArray();
    return { data: conversations.map((c) => this.formatConversation(c)) };
  }

  async createConversation(userId: string, participantIds: string[], type = 'direct', title?: string) {
    const participants = [...new Set([userId, ...participantIds])];
    const result = await this.db!.collection('conversations').insertOne({
      type,
      participants,
      title: title ?? null,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    });
    return { id: result.insertedId.toString(), type, participants };
  }

  async getMessages(conversationId: string, userId: string, limit = 50) {
    const conv = await this.getConversationOrThrow(conversationId, userId);
    const messages = await this.db!.collection('messages')
      .find({ conversationId: new ObjectId(conversationId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return { data: messages.reverse().map((m) => this.formatMessage(m)) };
  }

  async sendMessage(conversationId: string, senderId: string, body: string, attachments?: unknown[]) {
    const conv = await this.getConversationOrThrow(conversationId, senderId);
    const result = await this.db!.collection('messages').insertOne({
      conversationId: new ObjectId(conversationId),
      senderId,
      body,
      attachments: attachments ?? [],
      reactions: [],
      readBy: [{ userId: senderId, at: new Date() }],
      createdAt: new Date(),
    });
    await this.db!.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { lastMessageAt: new Date() } },
    );
    const message = {
      id: result.insertedId.toString(),
      conversationId,
      senderId,
      body,
      createdAt: new Date(),
    };
    const recipients = (conv.participants as string[]).filter((p) => p !== senderId);
    await this.kafka.publish('message-sent', 'message.sent', {
      ...message,
      recipientId: recipients[0],
    });
    // realtime fan-out: each recipient's SSE stream subscribes to msg:<userId>
    await Promise.all(recipients.map((p) => this.redis.publish(`msg:${p}`, message)));
    return message;
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.db!.collection('messages').findOne({
      _id: new ObjectId(messageId),
    });
    if (!message) throw new NotFoundError('Message not found');
    await this.getConversationOrThrow(
      (message.conversationId as ObjectId).toString(),
      userId,
    );
    await this.db!.collection('messages').updateOne(
      { _id: new ObjectId(messageId) },
      { $push: { reactions: { userId, emoji } } as never },
    );
    return { success: true };
  }

  private async getConversationOrThrow(conversationId: string, userId: string) {
    const conv = await this.db!.collection('conversations').findOne({
      _id: new ObjectId(conversationId),
    });
    if (!conv) throw new NotFoundError('Conversation not found');
    if (!conv.participants.includes(userId)) throw new ForbiddenError();
    return conv;
  }

  private formatConversation(c: Record<string, unknown>) {
    return {
      id: (c._id as ObjectId).toString(),
      type: c.type,
      participants: c.participants,
      title: c.title,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
    };
  }

  private formatMessage(m: Record<string, unknown>) {
    return {
      id: (m._id as ObjectId).toString(),
      conversationId: (m.conversationId as ObjectId).toString(),
      senderId: m.senderId,
      body: m.body,
      attachments: m.attachments,
      reactions: m.reactions,
      readBy: m.readBy,
      createdAt: m.createdAt,
    };
  }
}
