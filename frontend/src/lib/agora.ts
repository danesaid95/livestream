import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";

export type AgoraClientRole = "host" | "audience";

export interface AgoraConfig {
  appId: string;
  channel: string;
  token: string | null;
  uid: string | number;
  role: AgoraClientRole;
}

export interface LocalTracks {
  videoTrack: ICameraVideoTrack | null;
  audioTrack: IMicrophoneAudioTrack | null;
}

export interface RemoteUser {
  uid: string;
  videoTrack: IRemoteVideoTrack | null;
  audioTrack: IRemoteAudioTrack | null;
}

class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localTracks: LocalTracks = {
    videoTrack: null,
    audioTrack: null,
  };
  private remoteUsers: Map<string, RemoteUser> = new Map();
  private onUserJoined: ((user: RemoteUser) => void) | null = null;
  private onUserLeft: ((uid: string) => void) | null = null;
  private onConnectionStateChange: ((state: string) => void) | null = null;

  async initialize(config: AgoraConfig): Promise<void> {
    if (this.client) {
      await this.leave();
    }

    this.client = AgoraRTC.createClient({
      mode: "live",
      codec: "vp8",
    });

    await this.client.setClientRole(config.role);

    this.client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
      await this.client?.subscribe(user, mediaType);

      const uid = user.uid.toString();
      let remoteUser = this.remoteUsers.get(uid);

      if (!remoteUser) {
        remoteUser = {
          uid,
          videoTrack: null,
          audioTrack: null,
        };
        this.remoteUsers.set(uid, remoteUser);
      }

      if (mediaType === "video") {
        remoteUser.videoTrack = user.videoTrack || null;
      } else if (mediaType === "audio") {
        remoteUser.audioTrack = user.audioTrack || null;
        user.audioTrack?.play();
      }

      this.onUserJoined?.(remoteUser);
    });

    this.client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
      const uid = user.uid.toString();
      const remoteUser = this.remoteUsers.get(uid);

      if (remoteUser) {
        if (mediaType === "video") {
          remoteUser.videoTrack = null;
        } else if (mediaType === "audio") {
          remoteUser.audioTrack = null;
        }
      }
    });

    this.client.on("user-left", (user: IAgoraRTCRemoteUser) => {
      const uid = user.uid.toString();
      this.remoteUsers.delete(uid);
      this.onUserLeft?.(uid);
    });

    this.client.on("connection-state-change", (curState: string) => {
      this.onConnectionStateChange?.(curState);
    });

    await this.client.join(config.appId, config.channel, config.token, config.uid);
  }

  async publishLocalTracks(): Promise<LocalTracks> {
    if (!this.client) {
      throw new Error("Client not initialized");
    }

    const [audioTrack, videoTrack] = await Promise.all([
      AgoraRTC.createMicrophoneAudioTrack(),
      AgoraRTC.createCameraVideoTrack(),
    ]);

    this.localTracks = { audioTrack, videoTrack };

    await this.client.publish([audioTrack, videoTrack]);

    return this.localTracks;
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    if (this.localTracks.videoTrack) {
      await this.localTracks.videoTrack.setEnabled(enabled);
    }
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    if (this.localTracks.audioTrack) {
      await this.localTracks.audioTrack.setEnabled(enabled);
    }
  }

  async leave(): Promise<void> {
    if (this.localTracks.audioTrack) {
      this.localTracks.audioTrack.close();
    }
    if (this.localTracks.videoTrack) {
      this.localTracks.videoTrack.close();
    }

    this.localTracks = { audioTrack: null, videoTrack: null };
    this.remoteUsers.clear();

    if (this.client) {
      await this.client.leave();
      this.client = null;
    }
  }

  getRemoteUsers(): RemoteUser[] {
    return Array.from(this.remoteUsers.values());
  }

  getLocalTracks(): LocalTracks {
    return this.localTracks;
  }

  setOnUserJoined(callback: (user: RemoteUser) => void): void {
    this.onUserJoined = callback;
  }

  setOnUserLeft(callback: (uid: string) => void): void {
    this.onUserLeft = callback;
  }

  setOnConnectionStateChange(callback: (state: string) => void): void {
    this.onConnectionStateChange = callback;
  }

  getConnectionState(): string {
    return this.client?.connectionState || "DISCONNECTED";
  }
}

export const agoraService = new AgoraService();
export default agoraService;
