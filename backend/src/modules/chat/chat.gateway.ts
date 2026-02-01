import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ChatService, ChatMessage } from './chat.service';
import { UsersService } from '../users/users.service';

interface SendMessagePayload {
  streamId: string;
  userId: string;
  content: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly usersService: UsersService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Chat client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Chat client disconnected: ${client.id}`);
    this.removeClientFromAllRooms(client);
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; userId?: string },
  ) {
    const { streamId, userId } = data;
    const roomName = `chat_${streamId}`;

    client.join(roomName);

    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
    }

    const recentMessages = await this.chatService.getRecentMessages(streamId);
    client.emit('chat_history', { messages: recentMessages });

    this.logger.log(`Client ${client.id} joined chat for stream ${streamId}`);
  }

  @SubscribeMessage('leave_chat')
  handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string },
  ) {
    const { streamId } = data;
    const roomName = `chat_${streamId}`;

    client.leave(roomName);
    this.logger.log(`Client ${client.id} left chat for stream ${streamId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessagePayload,
  ) {
    const { streamId, userId, content } = data;

    if (!content || content.trim().length === 0) {
      return;
    }

    if (content.length > 500) {
      client.emit('error', { message: 'Message too long (max 500 characters)' });
      return;
    }

    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        client.emit('error', { message: 'User not found' });
        return;
      }

      const message: ChatMessage = {
        id: uuidv4(),
        streamId,
        userId,
        username: user.username,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl || undefined,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        isCreator: user.role === 'creator',
        isVerified: user.isVerified,
      };

      await this.chatService.publishMessage(streamId, message);

      const roomName = `chat_${streamId}`;
      this.server.to(roomName).emit('new_message', message);

    } catch (error) {
      this.logger.error('Failed to send message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; username: string },
  ) {
    const { streamId, username } = data;
    const roomName = `chat_${streamId}`;

    client.to(roomName).emit('user_typing', { username });
  }

  private removeClientFromAllRooms(client: Socket) {
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  }
}
