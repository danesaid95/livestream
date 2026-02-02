"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
  Sparkles,
  Users,
  Clock,
  Radio,
  ChevronLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth";
import { streamsApi } from "@/lib/api";
import agoraService, { LocalTracks } from "@/lib/agora";

const CATEGORIES = [
  { label: "Gaming", value: "gaming" },
  { label: "Music", value: "music" },
  { label: "Talk Show", value: "talk_show" },
  { label: "Education", value: "education" },
  { label: "Sports", value: "sports" },
  { label: "Creative", value: "creative" },
  { label: "Lifestyle", value: "lifestyle" },
  { label: "Other", value: "other" },
];

export default function GoLivePage() {
  const router = useRouter();
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const videoPreviewRef = useRef<HTMLDivElement>(null);
  const streamSocketRef = useRef<Socket | null>(null);
  const localTracksRef = useRef<LocalTracks | null>(null);
  const initializingRef = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [localTracks, setLocalTracks] = useState<LocalTracks | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Keep ref in sync with state for cleanup
  useEffect(() => {
    localTracksRef.current = localTracks;
  }, [localTracks]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    initializePreview();

    // Cleanup function that runs when component unmounts
    return () => {
      // Clean up local tracks using ref to avoid stale closure
      const tracks = localTracksRef.current;
      if (tracks?.audioTrack) {
        const mediaTrack = tracks.audioTrack.getMediaStreamTrack();
        if (mediaTrack) mediaTrack.stop();
        tracks.audioTrack.stop();
        tracks.audioTrack.close();
      }
      if (tracks?.videoTrack) {
        const mediaTrack = tracks.videoTrack.getMediaStreamTrack();
        if (mediaTrack) mediaTrack.stop();
        tracks.videoTrack.stop();
        tracks.videoTrack.close();
      }
      // Only reset refs if we had tracks (actual cleanup, not Strict Mode re-run)
      if (tracks) {
        localTracksRef.current = null;
        initializingRef.current = false;
      }
      // Leave Agora channel if connected
      agoraService.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        setStreamDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Connect to streams WebSocket when live to receive viewer count updates
  useEffect(() => {
    if (!isLive || !streamId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

    streamSocketRef.current = io(`${wsUrl}/streams`, {
      auth: {
        token: accessToken,
      },
      transports: ["websocket", "polling"],
    });

    streamSocketRef.current.on("connect", () => {
      streamSocketRef.current?.emit("join_stream", {
        streamId,
        userId: user?.id
      });
    });

    streamSocketRef.current.on("viewer_count_updated", (data: { viewerCount: number }) => {
      setViewerCount(data.viewerCount);
    });

    streamSocketRef.current.on("joined_stream", (data: { streamId: string; viewerCount: number }) => {
      setViewerCount(data.viewerCount);
    });

    return () => {
      streamSocketRef.current?.emit("leave_stream", { streamId });
      streamSocketRef.current?.disconnect();
    };
  }, [isLive, streamId, accessToken, user?.id]);

  const initializePreview = async () => {
    // Prevent double initialization (React Strict Mode calls effects twice)
    if (initializingRef.current) {
      return;
    }
    initializingRef.current = true;

    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

      // Double-check after async import in case another call completed
      if (localTracksRef.current) {
        initializingRef.current = false;
        return;
      }

      const [audioTrack, videoTrack] = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack(),
      ]);

      // Check again after track creation in case cleanup happened
      if (localTracksRef.current) {
        // Clean up the newly created tracks since we already have some
        audioTrack.stop();
        audioTrack.close();
        videoTrack.stop();
        videoTrack.close();
        initializingRef.current = false;
        return;
      }

      setLocalTracks({ audioTrack, videoTrack });

      if (videoPreviewRef.current && videoTrack) {
        videoTrack.play(videoPreviewRef.current);
      }
    } catch (err) {
      console.error("Failed to initialize camera/mic:", err);
      setError("Please allow camera and microphone access to go live.");
      initializingRef.current = false;
    }
  };

  const cleanupTracks = () => {
    if (localTracks?.audioTrack) {
      // Get the underlying MediaStreamTrack and stop it
      const mediaTrack = localTracks.audioTrack.getMediaStreamTrack();
      if (mediaTrack) {
        mediaTrack.stop();
      }
      localTracks.audioTrack.stop();
      localTracks.audioTrack.close();
    }
    if (localTracks?.videoTrack) {
      // Get the underlying MediaStreamTrack and stop it
      const mediaTrack = localTracks.videoTrack.getMediaStreamTrack();
      if (mediaTrack) {
        mediaTrack.stop();
      }
      localTracks.videoTrack.stop();
      localTracks.videoTrack.close();
    }
    setLocalTracks(null);
  };

  const toggleVideo = async () => {
    if (localTracks?.videoTrack) {
      await localTracks.videoTrack.setEnabled(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleAudio = async () => {
    if (localTracks?.audioTrack) {
      await localTracks.audioTrack.setEnabled(!isAudioOn);
      setIsAudioOn(!isAudioOn);
    }
  };

  const handleStartStream = async () => {
    if (!title.trim()) {
      setError("Please enter a stream title");
      return;
    }

    if (!category) {
      setError("Please select a category");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      // Create stream
      const createResponse = await streamsApi.create({
        title,
        description,
        category,
      });
      const newStreamId = createResponse.data.data.id;
      setStreamId(newStreamId);

      // Start stream
      const startResponse = await streamsApi.start(newStreamId);
      const { stream, token, uid } = startResponse.data.data;
      const channelName = stream.channelName;

      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
      if (!appId) {
        throw new Error("Agora App ID not configured");
      }

      // Initialize Agora as host with backend-generated credentials
      await agoraService.initialize({
        appId,
        channel: channelName,
        token: token,
        uid: uid,
        role: "host",
      });

      // Publish local tracks
      if (localTracks?.audioTrack && localTracks?.videoTrack) {
        const client = (agoraService as unknown as { client: { publish: (tracks: unknown[]) => Promise<void> } }).client;
        if (client) {
          await client.publish([localTracks.audioTrack, localTracks.videoTrack]);
        }

        // Capture thumbnail from video track after a short delay
        setTimeout(async () => {
          try {
            const imageData = await captureVideoThumbnail(localTracks.videoTrack);
            if (imageData && newStreamId) {
              await streamsApi.updateThumbnail(newStreamId, imageData);
              console.log("Thumbnail captured and uploaded successfully");
            }
          } catch (thumbnailErr) {
            console.error("Failed to capture thumbnail:", thumbnailErr);
          }
        }, 1000);
      }

      setIsLive(true);
    } catch (err) {
      console.error("Failed to start stream:", err);
      setError("Failed to start stream. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndStream = async () => {
    if (!streamId) return;

    try {
      await streamsApi.end(streamId);
      await agoraService.leave();
      cleanupTracks();
      setIsLive(false);
      router.push("/");
    } catch (err) {
      console.error("Failed to end stream:", err);
    }
  };

  const captureVideoThumbnail = async (videoTrack: LocalTracks["videoTrack"]): Promise<string | null> => {
    if (!videoTrack) return null;

    try {
      // Get the video element from the track
      const mediaStreamTrack = videoTrack.getMediaStreamTrack();
      const stream = new MediaStream([mediaStreamTrack]);

      // Create a temporary video element to capture the frame
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Wait for video to render a frame
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create canvas and capture frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Flip horizontally to match the preview (which is mirrored)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      // Cleanup
      video.pause();
      video.srcObject = null;

      return imageData;
    } catch (err) {
      console.error("Error capturing thumbnail:", err);
      return null;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500" />
              <h1 className="text-lg font-semibold">
                {isLive ? "You're Live!" : "Go Live"}
              </h1>
            </div>
          </div>

          {isLive && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span>{viewerCount}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{formatDuration(streamDuration)}</span>
              </div>
              <Badge className="bg-red-600 animate-pulse">LIVE</Badge>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden bg-gray-900 border-gray-800">
              <div className="relative aspect-video bg-black">
                <div
                  ref={videoPreviewRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ transform: "scaleX(-1)" }}
                />

                {!isVideoOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">Camera is off</p>
                    </div>
                  </div>
                )}

                {/* Live Indicator */}
                {isLive && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-red-600 animate-pulse">
                      <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                      LIVE
                    </Badge>
                  </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={toggleVideo}
                      className={`p-3 rounded-full transition-colors ${
                        isVideoOn
                          ? "bg-gray-700 hover:bg-gray-600"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {isVideoOn ? (
                        <Video className="w-5 h-5" />
                      ) : (
                        <VideoOff className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={toggleAudio}
                      className={`p-3 rounded-full transition-colors ${
                        isAudioOn
                          ? "bg-gray-700 hover:bg-gray-600"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {isAudioOn ? (
                        <Mic className="w-5 h-5" />
                      ) : (
                        <MicOff className="w-5 h-5" />
                      )}
                    </button>
                    <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Stream Settings */}
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <Card className="p-6 bg-gray-900 border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Stream Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Title *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's your stream about?"
                    className="bg-gray-800 border-gray-700"
                    disabled={isLive}
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell viewers more about your stream..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    disabled={isLive}
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Category *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => !isLive && setCategory(cat.value)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          category === cat.value
                            ? "bg-violet-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        } ${isLive ? "cursor-not-allowed opacity-50" : ""}`}
                        disabled={isLive}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Points Info */}
            <Card className="p-4 bg-gradient-to-br from-violet-900/30 to-purple-900/30 border-violet-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-600 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Earn Points</p>
                  <p className="text-sm text-gray-400">
                    Receive gifts from viewers during your stream
                  </p>
                </div>
              </div>
            </Card>

            {/* Action Button */}
            {isLive ? (
              <Button
                onClick={handleEndStream}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                End Stream
              </Button>
            ) : (
              <Button
                onClick={handleStartStream}
                disabled={isStarting || !title.trim() || !category}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                size="lg"
              >
                {isStarting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Radio className="w-5 h-5 mr-2" />
                    Go Live
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
