"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import {
  Heart,
  Share2,
  Flag,
  Users,
  Clock,
  Sparkles,
  ChevronLeft,
  MoreHorizontal,
  StopCircle,
  Home,
  Search,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/stream/video-player";
import { LiveChat } from "@/components/stream/live-chat";
import { GiftPanel } from "@/components/stream/gift-panel";
import { useAuthStore } from "@/stores/auth";
import { streamsApi, usersApi } from "@/lib/api";
import agoraService, { RemoteUser } from "@/lib/agora";
import { IRemoteVideoTrack } from "agora-rtc-sdk-ng";

interface StreamData {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnailUrl: string | null;
  status: string;
  viewerCount: number;
  startedAt: string | null;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    followerCount: number;
  };
  agoraToken?: string;
  channelName?: string;
  uid?: number;
}

export default function StreamViewerPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;
  const { isAuthenticated, accessToken, user, isHydrated } = useAuthStore();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isGiftPanelOpen, setIsGiftPanelOpen] = useState(false);
  const [connectionState, setConnectionState] = useState("DISCONNECTED");
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<IRemoteVideoTrack | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const streamSocketRef = useRef<Socket | null>(null);

  const fetchStream = useCallback(async () => {
    try {
      const response = await streamsApi.join(streamId);
      const data = response.data.data;
      setStream(data);
      setViewerCount(data.viewerCount || 0);

      // Check if the current user is following the streamer
      if (isAuthenticated && user?.id !== data.user.id) {
        try {
          const followResponse = await usersApi.getFollowStatus(data.user.id);
          setIsFollowing(followResponse.data.data?.isFollowing || false);
        } catch {
          // Ignore errors when checking follow status
        }
      }

      return data;
    } catch (err) {
      console.error("Failed to fetch stream:", err);
      setError("Stream not found or has ended");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [streamId, isAuthenticated, user?.id]);

  const initializeAgora = useCallback(async (streamData: StreamData) => {
    if (!streamData.agoraToken || !streamData.channelName || !streamData.uid) {
      console.log("No Agora credentials available");
      return;
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    if (!appId) {
      console.error("Agora App ID not configured");
      return;
    }

    try {
      agoraService.setOnConnectionStateChange(setConnectionState);
      agoraService.setOnUserJoined((user: RemoteUser) => {
        if (user.videoTrack) {
          setRemoteVideoTrack(user.videoTrack);
        }
      });
      agoraService.setOnUserLeft(() => {
        setRemoteVideoTrack(null);
      });

      await agoraService.initialize({
        appId,
        channel: streamData.channelName,
        token: streamData.agoraToken,
        uid: streamData.uid,
        role: "audience",
      });
    } catch (err) {
      console.error("Failed to initialize Agora:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const data = await fetchStream();
      if (data) {
        await initializeAgora(data);
      }
    };

    init();

    return () => {
      agoraService.leave();
      if (stream) {
        streamsApi.leave(streamId).catch(console.error);
      }
    };
  }, [streamId, fetchStream, initializeAgora]);

  // Connection timeout - detect when host is not broadcasting
  useEffect(() => {
    if (!stream || stream.status !== "live" || remoteVideoTrack) return;

    const timeout = setTimeout(() => {
      if (!remoteVideoTrack) {
        setConnectionTimeout(true);
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeout);
  }, [stream, remoteVideoTrack]);

  // Connect to streams WebSocket for real-time viewer count
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

    streamSocketRef.current = io(`${wsUrl}/streams`, {
      auth: {
        token: accessToken,
      },
      transports: ["websocket", "polling"],
    });

    streamSocketRef.current.on("connect", () => {
      // Join the stream room for viewer count updates
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

    streamSocketRef.current.on("gift_received", (data: { senderName: string; giftName: string; quantity: number }) => {
      console.log(`Gift received: ${data.quantity}x ${data.giftName} from ${data.senderName}`);
    });

    streamSocketRef.current.on("stream_ended", () => {
      setStream(prev => prev ? { ...prev, status: "ended" } : null);
      setRemoteVideoTrack(null);
    });

    return () => {
      streamSocketRef.current?.emit("leave_stream", { streamId });
      streamSocketRef.current?.disconnect();
    };
  }, [streamId, accessToken, user?.id]);

  // Update stream duration every second
  useEffect(() => {
    if (!stream?.startedAt) return;

    const calculateDuration = () => {
      const start = new Date(stream.startedAt!);
      const now = new Date();
      return Math.floor((now.getTime() - start.getTime()) / 1000);
    };

    setStreamDuration(calculateDuration());

    const interval = setInterval(() => {
      setStreamDuration(calculateDuration());
    }, 1000);

    return () => clearInterval(interval);
  }, [stream?.startedAt]);

  const handleEndStream = async () => {
    if (!stream || isEnding) return;

    setIsEnding(true);
    try {
      await streamsApi.end(streamId);
      await agoraService.leave();
      router.push("/");
    } catch (err) {
      console.error("Failed to end stream:", err);
      setIsEnding(false);
    }
  };

  // Check if user is the streamer
  const isStreamer = user?.id === stream?.user?.id;

  const handleFollow = async () => {
    if (!isAuthenticated || !stream || isFollowLoading) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await usersApi.unfollow(stream.user.id);
        setIsFollowing(false);
        setStream(prev => prev ? {
          ...prev,
          user: { ...prev.user, followerCount: Math.max(0, prev.user.followerCount - 1) }
        } : null);
      } else {
        await usersApi.follow(stream.user.id);
        setIsFollowing(true);
        setStream(prev => prev ? {
          ...prev,
          user: { ...prev.user, followerCount: prev.user.followerCount + 1 }
        } : null);
      }
    } catch (err) {
      console.error("Failed to follow:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: stream?.title,
        text: `Watch ${stream?.user.displayName} live on LiveStream!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
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

  if (isLoading || !isHydrated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          {error || "Stream not found"}
        </h1>
        <Button onClick={() => router.push("/")}>Back to Home</Button>
      </div>
    );
  }

  // Show stream ended overlay
  const isStreamEnded = stream.status === "ended";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Stream Ended Overlay */}
      {isStreamEnded && (
        <div className="fixed inset-0 z-50 bg-gray-950/95 flex items-center justify-center">
          <div className="text-center px-6 max-w-md">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6 ring-4 ring-gray-700">
              <Radio className="w-12 h-12 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Stream Has Ended</h2>
            <p className="text-gray-400 mb-6">
              Thanks for watching {stream.user.displayName}&apos;s stream! Check out other live streams or follow them to get notified when they go live again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => router.push("/")}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <Button
                onClick={() => router.push("/browse")}
                variant="outline"
              >
                <Search className="w-4 h-4 mr-2" />
                Browse Streams
              </Button>
            </div>
            {!isFollowing && !isStreamer && isAuthenticated && (
              <Button
                onClick={handleFollow}
                disabled={isFollowLoading}
                variant="ghost"
                className="mt-4"
              >
                <Heart className="w-4 h-4 mr-2" />
                Follow {stream.user.displayName}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Header Navigation */}
      <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-violet-500" />
              <span className="font-bold text-white hidden sm:inline">LiveStream</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {stream.status === "live" && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-600/20 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm font-medium">LIVE</span>
              </div>
            )}
            <span className="text-gray-400 text-sm hidden sm:inline">
              {viewerCount.toLocaleString()} watching
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/browse" className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white">
              <Search className="w-5 h-5" />
            </Link>
            {isAuthenticated ? (
              <Link href={`/profile/${user?.username}`} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <Avatar src={user?.avatarUrl} fallback={user?.displayName?.substring(0, 2) || "?"} size="sm" />
              </Link>
            ) : (
              <Link href="/auth/login">
                <Button size="sm" variant="outline">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video Player */}
          <VideoPlayer
            videoTrack={remoteVideoTrack}
            streamerName={stream.user.displayName}
            viewerCount={viewerCount}
            isLive={stream.status === "live"}
            connectionTimeout={connectionTimeout}
            className="w-full"
          />

          {/* Stream Info */}
          <div className="p-4 lg:p-6">
            {/* Title & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{stream.category}</Badge>
                  <span className="flex items-center gap-1 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    {formatDuration(streamDuration)}
                  </span>
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-white truncate">
                  {stream.title}
                </h1>
                {stream.description && (
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                    {stream.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Streamer Info */}
            <div className="flex items-center justify-between py-4 border-t border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar
                  src={stream.user.avatarUrl}
                  fallback={stream.user.displayName?.substring(0, 2) || "??"}
                  size="lg"
                />
                <div>
                  <a
                    href={`/profile/${stream.user.username}`}
                    className="font-semibold text-white hover:text-violet-400 transition-colors"
                  >
                    {stream.user.displayName}
                  </a>
                  <p className="text-sm text-gray-400">
                    {stream.user.followerCount?.toLocaleString() || 0} followers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isStreamer ? (
                  <Button
                    onClick={handleEndStream}
                    disabled={isEnding}
                    variant="destructive"
                    className="gap-2"
                  >
                    {isEnding ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <StopCircle className="w-4 h-4" />
                    )}
                    {isEnding ? "Ending..." : "End Stream"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsGiftPanelOpen(true)}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Send Gift
                  </Button>
                )}
                {user?.id !== stream.user.id && (
                  <Button
                    onClick={handleFollow}
                    disabled={isFollowLoading || !isAuthenticated}
                    variant={isFollowing ? "outline" : "default"}
                    className={
                      isFollowing
                        ? ""
                        : "bg-violet-600 hover:bg-violet-700"
                    }
                  >
                    {isFollowLoading ? (
                      <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Heart
                        className={`w-4 h-4 mr-2 ${
                          isFollowing ? "fill-current text-red-500" : ""
                        }`}
                      />
                    )}
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 py-4 border-t border-gray-800 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{viewerCount.toLocaleString()} watching</span>
              </div>
              <button className="flex items-center gap-2 hover:text-red-400 transition-colors">
                <Flag className="w-4 h-4" />
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="lg:w-[360px] lg:h-screen lg:border-l border-gray-800 flex-shrink-0">
          <LiveChat
            streamId={streamId}
            className="h-[400px] lg:h-full rounded-none"
            onSendGift={() => setIsGiftPanelOpen(true)}
          />
        </div>
      </div>

      {/* Gift Panel */}
      <GiftPanel
        streamId={streamId}
        receiverId={stream.user.id}
        isOpen={isGiftPanelOpen}
        onClose={() => setIsGiftPanelOpen(false)}
        onGiftSent={(gift, amount) => {
          console.log(`Sent ${amount}x ${gift.name}`);
        }}
      />
    </div>
  );
}
