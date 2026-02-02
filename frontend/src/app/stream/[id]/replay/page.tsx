"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Share2,
  Flag,
  Users,
  Clock,
  ChevronLeft,
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth";
import { streamsApi, usersApi } from "@/lib/api";

interface StreamData {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnailUrl: string | null;
  status: string;
  viewerCount: number;
  totalViews: number;
  peakViewerCount: number;
  startedAt: string | null;
  endedAt: string | null;
  durationInSeconds: number | null;
  recordingUrl: string | null;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    followerCount: number;
  };
}

export default function ReplayPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;
  const { isAuthenticated, user } = useAuthStore();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const fetchStream = async () => {
      try {
        const response = await streamsApi.getById(streamId);
        const data = response.data.data;

        if (data.status !== "ended") {
          // Stream is not ended, redirect to live view
          router.replace(`/stream/${streamId}`);
          return;
        }

        if (!data.recordingUrl) {
          setError("No recording available for this stream");
          setIsLoading(false);
          return;
        }

        setStream(data);

        // Check if the current user is following the streamer
        if (isAuthenticated && user?.id !== data.user.id) {
          try {
            const followResponse = await usersApi.getFollowStatus(data.user.id);
            setIsFollowing(followResponse.data.data?.isFollowing || false);
          } catch {
            // Ignore errors when checking follow status
          }
        }
      } catch (err) {
        console.error("Failed to fetch stream:", err);
        setError("Stream not found");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStream();
  }, [streamId, isAuthenticated, user?.id, router]);

  // Video control handlers
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, videoRef.current.currentTime + seconds)
      );
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFollow = async () => {
    if (!isAuthenticated || !stream || isFollowLoading) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await usersApi.unfollow(stream.user.id);
        setIsFollowing(false);
        setStream((prev) =>
          prev
            ? {
                ...prev,
                user: {
                  ...prev.user,
                  followerCount: Math.max(0, prev.user.followerCount - 1),
                },
              }
            : null
        );
      } else {
        await usersApi.follow(stream.user.id);
        setIsFollowing(true);
        setStream((prev) =>
          prev
            ? {
                ...prev,
                user: { ...prev.user, followerCount: prev.user.followerCount + 1 },
              }
            : null
        );
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
        text: `Watch ${stream?.user.displayName}'s past broadcast on LiveStream!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mobile Back Button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => router.back()}
          className="p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video Player */}
          <div
            ref={containerRef}
            className={`relative bg-black group ${
              isFullscreen ? "fixed inset-0 z-50" : "aspect-video"
            }`}
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            <video
              ref={videoRef}
              src={stream.recordingUrl || undefined}
              className="w-full h-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
              poster={stream.thumbnailUrl || undefined}
            />

            {/* Replay Badge */}
            <div
              className={`absolute top-4 left-4 flex items-center gap-3 transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
              }`}
            >
              <Badge className="bg-violet-600">REPLAY</Badge>
              <span className="px-2 py-1 bg-black/60 text-white text-xs rounded flex items-center gap-1">
                <Users className="w-3 h-3" />
                {stream.totalViews.toLocaleString()} views
              </span>
            </div>

            {/* Streamer Name */}
            <div
              className={`absolute top-4 right-4 transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="px-3 py-1 bg-black/60 text-white text-sm rounded-full">
                {stream.user.displayName}
              </span>
            </div>

            {/* Play Button Overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={togglePlay}
                  className="p-4 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                >
                  <Play className="w-12 h-12 text-white fill-white" />
                </button>
              </div>
            )}

            {/* Controls Bar */}
            <div
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 accent-violet-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Skip Back */}
                  <button
                    onClick={() => skip(-10)}
                    className="text-white hover:text-violet-400 transition-colors"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-violet-400 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>

                  {/* Skip Forward */}
                  <button
                    onClick={() => skip(10)}
                    className="text-white hover:text-violet-400 transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2 group/volume">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-violet-400 transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-6 h-6" />
                      ) : (
                        <Volume2 className="w-6 h-6" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/volume:w-20 transition-all duration-200 accent-violet-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-violet-400 transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-6 h-6" />
                    ) : (
                      <Maximize className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stream Info */}
          <div className="p-4 lg:p-6">
            {/* Title & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{stream.category}</Badge>
                  {stream.durationInSeconds && (
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      {formatTime(stream.durationInSeconds)}
                    </span>
                  )}
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
                {user?.id !== stream.user.id && (
                  <Button
                    onClick={handleFollow}
                    disabled={isFollowLoading || !isAuthenticated}
                    variant={isFollowing ? "outline" : "default"}
                    className={
                      isFollowing ? "" : "bg-violet-600 hover:bg-violet-700"
                    }
                  >
                    {isFollowLoading ? (
                      <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 py-4 border-t border-gray-800 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{stream.totalViews.toLocaleString()} total views</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{stream.peakViewerCount.toLocaleString()} peak viewers</span>
              </div>
              <button className="flex items-center gap-2 hover:text-red-400 transition-colors">
                <Flag className="w-4 h-4" />
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-[360px] lg:h-screen lg:border-l border-gray-800 flex-shrink-0 p-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              About this stream
            </h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div>
                <span className="text-gray-500">Streamed on</span>
                <p className="text-white">
                  {stream.startedAt
                    ? new Date(stream.startedAt).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown"}
                </p>
              </div>
              {stream.durationInSeconds && (
                <div>
                  <span className="text-gray-500">Duration</span>
                  <p className="text-white">
                    {formatTime(stream.durationInSeconds)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Peak viewers</span>
                <p className="text-white">
                  {stream.peakViewerCount.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Total views</span>
                <p className="text-white">
                  {stream.totalViews.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
