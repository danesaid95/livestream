import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { v4 as uuidv4 } from 'uuid';
import { Stream, StreamStatus, StreamCategory } from './entities/stream.entity';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { AgoraRecordingService } from '../../common/services/agora-recording.service';

@Injectable()
export class StreamsService {
  private readonly logger = new Logger(StreamsService.name);

  constructor(
    @InjectRepository(Stream)
    private readonly streamRepository: Repository<Stream>,
    private readonly configService: ConfigService,
    private readonly agoraRecordingService: AgoraRecordingService,
  ) {}

  async create(userId: string, createStreamDto: CreateStreamDto): Promise<Stream> {
    const channelName = `stream_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    const stream = this.streamRepository.create({
      ...createStreamDto,
      userId,
      channelName,
      status: StreamStatus.SCHEDULED,
    });

    return this.streamRepository.save(stream);
  }

  async findById(id: string): Promise<Stream | null> {
    return this.streamRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByIdOrFail(id: string): Promise<Stream> {
    const stream = await this.findById(id);
    if (!stream) {
      throw new NotFoundException('Stream not found');
    }
    return stream;
  }

  async getLiveStreams(
    page: number = 1,
    limit: number = 20,
    category?: StreamCategory,
  ): Promise<{ streams: Stream[]; total: number }> {
    const queryBuilder = this.streamRepository
      .createQueryBuilder('stream')
      .leftJoinAndSelect('stream.user', 'user')
      .where('stream.status = :status', { status: StreamStatus.LIVE });

    if (category) {
      queryBuilder.andWhere('stream.category = :category', { category });
    }

    const [streams, total] = await queryBuilder
      .orderBy('stream.viewerCount', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { streams, total };
  }

  async getUserStreams(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ streams: Stream[]; total: number }> {
    const [streams, total] = await this.streamRepository.findAndCount({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { streams, total };
  }

  async startStream(id: string, userId: string): Promise<{ stream: Stream; token: string; uid: number }> {
    const stream = await this.findByIdOrFail(id);

    if (stream.userId !== userId) {
      throw new ForbiddenException('You can only start your own streams');
    }

    if (stream.status === StreamStatus.LIVE) {
      throw new ForbiddenException('Stream is already live');
    }

    const { token, uid } = this.generateAgoraToken(stream.channelName, userId, true);

    stream.status = StreamStatus.LIVE;
    stream.startedAt = new Date();
    stream.agoraToken = token;
    stream.recordingUid = uid;

    // Start cloud recording if configured
    if (this.agoraRecordingService.isConfigured()) {
      try {
        const resourceId = await this.agoraRecordingService.acquireResource(stream.channelName, uid);
        if (resourceId) {
          const recordingResult = await this.agoraRecordingService.startRecording(
            {
              channelName: stream.channelName,
              uid,
              token,
            },
            resourceId,
            stream.id,
          );

          if (recordingResult) {
            stream.recordingResourceId = recordingResult.resourceId;
            stream.recordingSid = recordingResult.sid;
            this.logger.log(`Recording started for stream ${stream.id}`);
          }
        }
      } catch (error) {
        this.logger.error('Failed to start recording', error);
        // Continue without recording - don't fail the stream start
      }
    }

    await this.streamRepository.save(stream);

    return { stream, token, uid };
  }

  async endStream(id: string, userId: string): Promise<Stream> {
    const stream = await this.findByIdOrFail(id);

    if (stream.userId !== userId) {
      throw new ForbiddenException('You can only end your own streams');
    }

    // Stop cloud recording if it was started
    if (stream.recordingResourceId && stream.recordingSid && stream.recordingUid) {
      try {
        const stopResult = await this.agoraRecordingService.stopRecording(
          stream.channelName,
          stream.recordingUid,
          stream.recordingResourceId,
          stream.recordingSid,
        );

        if (stopResult?.serverResponse?.fileList) {
          // Find the MP4 file from the recording
          const mp4File = stopResult.serverResponse.fileList.find(
            (f) => f.fileName.endsWith('.mp4'),
          );
          if (mp4File) {
            stream.recordingUrl = this.agoraRecordingService.getRecordingUrl(
              stream.id,
              mp4File.fileName,
            );
            this.logger.log(`Recording saved for stream ${stream.id}: ${stream.recordingUrl}`);
          }
        }
      } catch (error) {
        this.logger.error('Failed to stop recording', error);
        // Continue with ending the stream even if recording stop fails
      }
    }

    stream.status = StreamStatus.ENDED;
    stream.endedAt = new Date();

    if (stream.startedAt) {
      stream.durationInSeconds = Math.floor(
        (stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000,
      );
    }

    return this.streamRepository.save(stream);
  }

  async getViewerToken(id: string, viewerId: string): Promise<{ token: string; uid: number }> {
    const stream = await this.findByIdOrFail(id);

    if (stream.status !== StreamStatus.LIVE) {
      throw new ForbiddenException('Stream is not live');
    }

    return this.generateAgoraToken(stream.channelName, viewerId, false);
  }

  async joinStream(id: string, viewerId?: string): Promise<{ stream: Stream; agoraToken: string; uid: number }> {
    const stream = await this.findByIdOrFail(id);

    if (stream.status !== StreamStatus.LIVE) {
      throw new ForbiddenException('Stream is not live');
    }

    // Generate a viewer ID if not authenticated
    const finalViewerId = viewerId || uuidv4();
    const { token, uid } = this.generateAgoraToken(stream.channelName, finalViewerId, false);

    // Increment total views
    await this.incrementTotalViews(id);

    return {
      stream,
      agoraToken: token,
      uid,
    };
  }

  async leaveStream(id: string): Promise<void> {
    // This can be used for analytics or viewer count tracking
    // For now, just verify the stream exists
    await this.findByIdOrFail(id);
  }

  async updateThumbnail(id: string, userId: string, imageData: string): Promise<Stream> {
    const stream = await this.findByIdOrFail(id);

    if (stream.userId !== userId) {
      throw new ForbiddenException('You can only update your own streams');
    }

    // Validate base64 image data
    const matches = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException('Invalid image data format');
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save the file
    const filename = `${stream.id}-${Date.now()}.${extension}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);

    // Update the stream with the thumbnail URL
    const baseUrl = this.configService.get<string>('app.baseUrl', 'http://localhost:3000');
    stream.thumbnailUrl = `${baseUrl}/uploads/thumbnails/${filename}`;

    return this.streamRepository.save(stream);
  }

  async updateViewerCount(id: string, count: number): Promise<void> {
    const stream = await this.findByIdOrFail(id);

    stream.viewerCount = count;
    if (count > stream.peakViewerCount) {
      stream.peakViewerCount = count;
    }

    await this.streamRepository.save(stream);
  }

  async incrementTotalViews(id: string): Promise<void> {
    await this.streamRepository.increment({ id }, 'totalViews', 1);
  }

  async update(id: string, userId: string, updateStreamDto: UpdateStreamDto): Promise<Stream> {
    const stream = await this.findByIdOrFail(id);

    if (stream.userId !== userId) {
      throw new ForbiddenException('You can only update your own streams');
    }

    Object.assign(stream, updateStreamDto);
    return this.streamRepository.save(stream);
  }

  private generateAgoraToken(
    channelName: string,
    uid: string,
    isPublisher: boolean,
  ): { token: string; uid: number } {
    const appId = this.configService.get<string>('agora.appId');
    const appCertificate = this.configService.get<string>('agora.appCertificate');
    const expirationTimeInSeconds = this.configService.get<number>('agora.tokenExpirationInSeconds', 3600);

    if (!appId || !appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const role = isPublisher ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const uidNumber = parseInt(uid.replace(/-/g, '').substring(0, 8), 16) % 100000000;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uidNumber,
      role,
      privilegeExpiredTs,
    );

    return { token, uid: uidNumber };
  }
}
