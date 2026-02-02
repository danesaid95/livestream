import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  apiPrefix: 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
}));
