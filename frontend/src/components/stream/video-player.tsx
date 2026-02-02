"use client";

import { useEffect, useRef, useState } from "react";
import { IRemoteVideoTrack, ICameraVideoTrack } from "agora-rtc-sdk-ng";
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Play,
  Pause,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  videoTrack: IRemoteVideoTrack | ICameraVideoTrack | null;
  isLocal?: boolean;
  streamerName?: string;
  viewerCount?: number;
  isLive?: boolean;
  connectionTimeout?: boolean;
  className?: string;
}

export function VideoPlayer({
  videoTrack,
  isLocal = false,
  streamerName,
  viewerCount = 0,
  isLive = true,
  connectionTimeout = false,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(100);

  useEffect(() => {
    if (videoTrack && videoRef.current) {
      videoTrack.play(videoRef.current);
    }

    return () => {
      if (videoTrack) {
        videoTrack.stop();
      }
    };
  }, [videoTrack]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", () => setShowControls(false));
      container.addEventListener("mouseenter", () => setShowControls(true));
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", () => setShowControls(false));
        container.removeEventListener("mouseenter", () => setShowControls(true));
      }
      clearTimeout(timeout);
    };
  }, []);

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

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoTrack && "setVolume" in videoTrack) {
      (videoTrack as IRemoteVideoTrack).setVolume(isMuted ? volume : 0);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoTrack && "setVolume" in videoTrack) {
      (videoTrack as IRemoteVideoTrack).setVolume(newVolume);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-lg overflow-hidden group",
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "aspect-video",
        className
      )}
    >
      {/* Video Container */}
      <div
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: isLocal ? "scaleX(-1)" : undefined }}
      />

      {/* No Video Fallback */}
      {!videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Play className="w-10 h-10 text-gray-500" />
            </div>
            <p className="text-gray-400">
              {!isLive
                ? "Stream offline"
                : connectionTimeout
                ? "Host is not broadcasting"
                : "Connecting to stream..."}
            </p>
            {connectionTimeout && isLive && (
              <p className="text-gray-500 text-sm mt-2">
                The streamer may have disconnected or is experiencing issues
              </p>
            )}
          </div>
        </div>
      )}

      {/* Live Badge & Viewer Count */}
      <div
        className={cn(
          "absolute top-4 left-4 flex items-center gap-3 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {isLive && (
          <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded uppercase flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Live
          </span>
        )}
        <span className="px-2 py-1 bg-black/60 text-white text-xs rounded flex items-center gap-1">
          <Users className="w-3 h-3" />
          {viewerCount.toLocaleString()}
        </span>
      </div>

      {/* Streamer Name */}
      {streamerName && (
        <div
          className={cn(
            "absolute top-4 right-4 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="px-3 py-1 bg-black/60 text-white text-sm rounded-full">
            {streamerName}
          </span>
        </div>
      )}

      {/* Controls Bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-white hover:text-violet-400 transition-colors"
            >
              {isPaused ? (
                <Play className="w-6 h-6" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
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
            {/* Settings */}
            <button className="text-white hover:text-violet-400 transition-colors">
              <Settings className="w-5 h-5" />
            </button>

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
  );
}
