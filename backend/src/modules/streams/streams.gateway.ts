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
import { StreamsService } from './streams.service';

interface StreamRoom {
  streamId: string;
  viewers: Set<string>;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/streams',
})
export class StreamsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StreamsGateway.name);
  private streamRooms: Map<string, StreamRoom> = new Map();

  constructor(private readonly streamsService: StreamsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.removeClientFromAllRooms(client);
  }

  @SubscribeMessage('join_stream')
  async handleJoinStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; userId?: string },
  ) {
    const { streamId, userId } = data;
    const roomName = `stream_${streamId}`;

    client.join(roomName);

    if (!this.streamRooms.has(streamId)) {
      this.streamRooms.set(streamId, {
        streamId,
        viewers: new Set(),
      });
    }

    const room = this.streamRooms.get(streamId)!;
    room.viewers.add(client.id);

    const viewerCount = room.viewers.size;
    await this.streamsService.updateViewerCount(streamId, viewerCount);

    if (userId) {
      await this.streamsService.incrementTotalViews(streamId);
    }

    this.server.to(roomName).emit('viewer_count_updated', { viewerCount });

    client.emit('joined_stream', { streamId, viewerCount });

    this.logger.log(`Client ${client.id} joined stream ${streamId}`);
  }

  @SubscribeMessage('leave_stream')
  async handleLeaveStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string },
  ) {
    const { streamId } = data;
    await this.removeClientFromStream(client, streamId);
  }

  @SubscribeMessage('stream_reaction')
  handleStreamReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; reaction: string },
  ) {
    const { streamId, reaction } = data;
    const roomName = `stream_${streamId}`;

    this.server.to(roomName).emit('reaction_received', {
      reaction,
      timestamp: new Date().toISOString(),
    });
  }

  async broadcastGiftToStream(
    streamId: string,
    gift: { senderName: string; giftName: string; quantity: number; message?: string },
  ) {
    const roomName = `stream_${streamId}`;
    this.server.to(roomName).emit('gift_received', gift);
  }

  private async removeClientFromStream(client: Socket, streamId: string) {
    const roomName = `stream_${streamId}`;
    client.leave(roomName);

    const room = this.streamRooms.get(streamId);
    if (room) {
      room.viewers.delete(client.id);
      const viewerCount = room.viewers.size;

      if (viewerCount === 0) {
        this.streamRooms.delete(streamId);
      } else {
        await this.streamsService.updateViewerCount(streamId, viewerCount);
        this.server.to(roomName).emit('viewer_count_updated', { viewerCount });
      }
    }

    this.logger.log(`Client ${client.id} left stream ${streamId}`);
  }

  private removeClientFromAllRooms(client: Socket) {
    for (const [streamId, room] of this.streamRooms.entries()) {
      if (room.viewers.has(client.id)) {
        this.removeClientFromStream(client, streamId);
      }
    }
  }
}
