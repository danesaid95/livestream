import { registerAs } from '@nestjs/config';

export const agoraConfig = registerAs('agora', () => ({
  appId: process.env.AGORA_APP_ID || '',
  appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  tokenExpirationInSeconds: parseInt(process.env.AGORA_TOKEN_EXPIRATION || '3600', 10),
  privilegeExpirationInSeconds: parseInt(process.env.AGORA_PRIVILEGE_EXPIRATION || '3600', 10),
}));
