import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface AcquireResponse {
  resourceId: string;
}

interface StartRecordingResponse {
  sid: string;
  resourceId: string;
}

interface StopRecordingResponse {
  resourceId: string;
  sid: string;
  serverResponse: {
    fileList?: Array<{
      fileName: string;
      trackType: string;
      uid: string;
      mixedAllUser: boolean;
      isPlayable: boolean;
      sliceStartTime: number;
    }>;
    uploadingStatus?: string;
  };
}

interface RecordingConfig {
  channelName: string;
  uid: number;
  token: string;
}

@Injectable()
export class AgoraRecordingService {
  private readonly logger = new Logger(AgoraRecordingService.name);
  private readonly apiClient: AxiosInstance;
  private readonly appId: string;
  private readonly customerId: string;
  private readonly customerSecret: string;
  private readonly s3Bucket: string;
  private readonly s3Region: string;
  private readonly s3AccessKey: string;
  private readonly s3SecretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('AGORA_APP_ID', '');
    this.customerId = this.configService.get<string>('AGORA_CUSTOMER_ID', '');
    this.customerSecret = this.configService.get<string>('AGORA_CUSTOMER_SECRET', '');
    this.s3Bucket = this.configService.get<string>('AWS_S3_BUCKET', '');
    this.s3Region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.s3AccessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID', '');
    this.s3SecretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY', '');

    const credentials = Buffer.from(`${this.customerId}:${this.customerSecret}`).toString('base64');

    this.apiClient = axios.create({
      baseURL: 'https://api.agora.io/v1/apps',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
    });
  }

  isConfigured(): boolean {
    return !!(
      this.appId &&
      this.customerId &&
      this.customerSecret &&
      this.s3Bucket &&
      this.s3AccessKey &&
      this.s3SecretKey
    );
  }

  async acquireResource(channelName: string, uid: number): Promise<string | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Agora Cloud Recording not configured');
      return null;
    }

    try {
      const response = await this.apiClient.post<AcquireResponse>(
        `/${this.appId}/cloud_recording/acquire`,
        {
          cname: channelName,
          uid: String(uid),
          clientRequest: {
            resourceExpiredHour: 24,
            scene: 0,
          },
        },
      );

      return response.data.resourceId;
    } catch (error) {
      this.logger.error('Failed to acquire recording resource', error);
      return null;
    }
  }

  async startRecording(
    config: RecordingConfig,
    resourceId: string,
    streamId: string,
  ): Promise<{ sid: string; resourceId: string } | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Agora Cloud Recording not configured');
      return null;
    }

    try {
      const recordingUid = config.uid + 1; // Use a different UID for recording

      const response = await this.apiClient.post<StartRecordingResponse>(
        `/${this.appId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
        {
          cname: config.channelName,
          uid: String(recordingUid),
          clientRequest: {
            token: config.token,
            recordingConfig: {
              maxIdleTime: 30,
              streamTypes: 2, // Audio and video
              channelType: 1, // Live broadcast
              videoStreamType: 0, // High stream
              transcodingConfig: {
                height: 720,
                width: 1280,
                bitrate: 2000,
                fps: 30,
                mixedVideoLayout: 1, // Floating layout
                backgroundColor: '#000000',
              },
            },
            recordingFileConfig: {
              avFileType: ['hls', 'mp4'],
            },
            storageConfig: {
              vendor: 1, // AWS S3
              region: this.getS3RegionCode(),
              bucket: this.s3Bucket,
              accessKey: this.s3AccessKey,
              secretKey: this.s3SecretKey,
              fileNamePrefix: ['recordings', streamId],
            },
          },
        },
      );

      return {
        sid: response.data.sid,
        resourceId: response.data.resourceId,
      };
    } catch (error) {
      this.logger.error('Failed to start recording', error);
      return null;
    }
  }

  async stopRecording(
    channelName: string,
    uid: number,
    resourceId: string,
    sid: string,
  ): Promise<StopRecordingResponse | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Agora Cloud Recording not configured');
      return null;
    }

    try {
      const recordingUid = uid + 1;

      const response = await this.apiClient.post<StopRecordingResponse>(
        `/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
        {
          cname: channelName,
          uid: String(recordingUid),
          clientRequest: {},
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to stop recording', error);
      return null;
    }
  }

  async queryRecording(
    resourceId: string,
    sid: string,
  ): Promise<any> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await this.apiClient.get(
        `/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to query recording', error);
      return null;
    }
  }

  getRecordingUrl(streamId: string, filename: string): string {
    return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/recordings/${streamId}/${filename}`;
  }

  private getS3RegionCode(): number {
    const regionMap: Record<string, number> = {
      'us-east-1': 0,
      'us-east-2': 1,
      'us-west-1': 2,
      'us-west-2': 3,
      'eu-west-1': 4,
      'eu-west-2': 5,
      'eu-west-3': 6,
      'eu-central-1': 7,
      'ap-southeast-1': 8,
      'ap-southeast-2': 9,
      'ap-northeast-1': 10,
      'ap-northeast-2': 11,
      'sa-east-1': 12,
      'ca-central-1': 13,
      'ap-south-1': 14,
      'cn-north-1': 15,
      'cn-northwest-1': 16,
      'us-gov-west-1': 17,
    };

    return regionMap[this.s3Region] ?? 0;
  }
}
