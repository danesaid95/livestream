import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GiftsService } from './gifts.service';
import { GiftsController } from './gifts.controller';
import { Gift } from './entities/gift.entity';
import { GiftTransaction } from './entities/gift-transaction.entity';
import { UsersModule } from '../users/users.module';
import { StreamsModule } from '../streams/streams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Gift, GiftTransaction]),
    UsersModule,
    StreamsModule,
  ],
  controllers: [GiftsController],
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
