import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StreamsService } from './streams.service';
import { StreamsController } from './streams.controller';
import { StreamsGateway } from './streams.gateway';
import { Stream } from './entities/stream.entity';
import { UsersModule } from '../users/users.module';
import { AgoraRecordingService } from '../../common/services/agora-recording.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stream]),
    ConfigModule,
    UsersModule,
  ],
  controllers: [StreamsController],
  providers: [StreamsService, StreamsGateway, AgoraRecordingService],
  exports: [StreamsService],
})
export class StreamsModule {}
