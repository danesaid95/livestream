import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { PointTransaction } from './entities/point-transaction.entity';
import { PointPackage } from './entities/point-package.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointTransaction, PointPackage]),
    ConfigModule,
    UsersModule,
  ],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
