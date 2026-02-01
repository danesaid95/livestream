import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { v4 as uuidv4 } from 'uuid';
import { Stream, StreamStatus, StreamCategory } from './entities/stream.entity';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';

@Injectable()
export class StreamsService {
  constructor(
    @InjectRepository(Stream)
    private readonly streamRepository: Repository<Stream>,
    private readonly configService: ConfigService,
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

  async startStream(id: string, userId: string): Promise<{ stream: Stream; token: string }> {
    const stream = await this.findByIdOrFail(id);

    if (stream.userId !== userId) {
      throw new ForbiddenException('You can only start your own streams');
    }

    if (stream.status === StreamStatus.LIVE) {
      throw new ForbiddenException('Stream is already live');
    }

    const token = this.generateAgoraToken(stream.channelName, userId, true);

    stream.status = StreamStatus.LIVE;
    stream.startedAt = new Date();
    stream.agoraToken = token;

    await this.streamRepository.save(stream);

    return { stream, token };
  }

  async endStream(id: string, userId: string): Promise<Stream> {
    const stream = await this.findByIdOrFail(id);

    if (stream.userId !== userId) {
      throw new ForbiddenException('You can only end your own streams');
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

  async getViewerToken(id: string, viewerId: string): Promise<string> {
    const stream = await this.findByIdOrFail(id);

    if (stream.status !== StreamStatus.LIVE) {
      throw new ForbiddenException('Stream is not live');
    }

    return this.generateAgoraToken(stream.channelName, viewerId, false);
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
  ): string {
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

    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uidNumber,
      role,
      privilegeExpiredTs,
    );
  }
}
