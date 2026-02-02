import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StreamsModule } from './modules/streams/streams.module';
import { GiftsModule } from './modules/gifts/gifts.module';
import { PointsModule } from './modules/points/points.module';
import { ChatModule } from './modules/chat/chat.module';
import { databaseConfig } from './config/database.config';
import { appConfig } from './config/app.config';
import { jwtConfig } from './config/jwt.config';
import { agoraConfig } from './config/agora.config';
import { stripeConfig } from './config/stripe.config';
import { redisConfig } from './config/redis.config';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, agoraConfig, stripeConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('database.url');
        const isProduction = configService.get<string>('NODE_ENV') === 'production';

        const baseConfig = {
          type: 'postgres' as const,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: isProduction, // Auto-sync for initial deployment
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };

        if (databaseUrl) {
          return { ...baseConfig, url: databaseUrl };
        }

        return {
          ...baseConfig,
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.name'),
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    StreamsModule,
    GiftsModule,
    PointsModule,
    ChatModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
