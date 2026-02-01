import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StreamsService } from './streams.service';
import { StreamsController } from './streams.controller';
import { StreamsGateway } from './streams.gateway';
import { Stream } from './entities/stream.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stream]),
    ConfigModule,
    UsersModule,
  ],
  controllers: [StreamsController],
  providers: [StreamsService, StreamsGateway],
  exports: [StreamsService],
})
export class StreamsModule {}
