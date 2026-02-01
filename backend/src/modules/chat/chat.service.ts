import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  timestamp: string;
  isCreator: boolean;
  isVerified: boolean;
}

@Injectable()
export class ChatService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private subscriber: Redis | null = null;
  private messageHandlers: Map<string, (message: ChatMessage) => void> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url');
    const redisHost = this.configService.get<string>('redis.host');
    const redisPort = this.configService.get<number>('redis.port');
    const redisPassword = this.configService.get<string>('redis.password');

    const redisConfig = redisUrl
      ? redisUrl
      : {
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
        };

    try {
      this.redis = new Redis(redisConfig as any);
      this.subscriber = new Redis(redisConfig as any);

      this.subscriber.on('message', (channel: string, message: string) => {
        const handler = this.messageHandlers.get(channel);
        if (handler) {
          try {
            const parsedMessage = JSON.parse(message) as ChatMessage;
            handler(parsedMessage);
          } catch (error) {
            console.error('Failed to parse chat message:', error);
          }
        }
      });
    } catch (error) {
      console.warn('Redis connection failed, chat will work without persistence:', error);
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  async publishMessage(streamId: string, message: ChatMessage): Promise<void> {
    const channel = `chat:${streamId}`;

    if (this.redis) {
      await this.redis.publish(channel, JSON.stringify(message));

      const historyKey = `chat:history:${streamId}`;
      await this.redis.lpush(historyKey, JSON.stringify(message));
      await this.redis.ltrim(historyKey, 0, 99);
      await this.redis.expire(historyKey, 86400);
    }
  }

  async subscribeToStream(
    streamId: string,
    handler: (message: ChatMessage) => void,
  ): Promise<void> {
    const channel = `chat:${streamId}`;
    this.messageHandlers.set(channel, handler);

    if (this.subscriber) {
      await this.subscriber.subscribe(channel);
    }
  }

  async unsubscribeFromStream(streamId: string): Promise<void> {
    const channel = `chat:${streamId}`;
    this.messageHandlers.delete(channel);

    if (this.subscriber) {
      await this.subscriber.unsubscribe(channel);
    }
  }

  async getRecentMessages(streamId: string, limit: number = 50): Promise<ChatMessage[]> {
    if (!this.redis) {
      return [];
    }

    const historyKey = `chat:history:${streamId}`;
    const messages = await this.redis.lrange(historyKey, 0, limit - 1);

    return messages.map((msg) => JSON.parse(msg) as ChatMessage).reverse();
  }

  async clearChatHistory(streamId: string): Promise<void> {
    if (this.redis) {
      const historyKey = `chat:history:${streamId}`;
      await this.redis.del(historyKey);
    }
  }
}
