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
    // setVolume exists on audio tracks, not video tracks - use runtime check with any assertion
    if (videoTrack && "setVolume" in videoTrack) {
      (videoTrack as unknown as { setVolume: (vol: number) => void }).setVolume(isMuted ? volume : 0);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    // setVolume exists on audio tracks, not video tracks - use runtime check with any assertion
    if (videoTrack && "setVolume" in videoTrack) {
      (videoTrack as unknown as { setVolume: (vol: number) => void }).setVolume(newVolume);
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
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-violet-900/30">
          <div className="text-center px-6">
            {!isLive ? (
              <>
                <div className="w-24 h-24 rounded-full bg-gray-800/80 flex items-center justify-center mx-auto mb-6 ring-4 ring-gray-700/50">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Stream Has Ended</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  This stream has ended. Check out other live streams or wait for the streamer to go live again.
                </p>
              </>
            ) : connectionTimeout ? (
              <>
                <div className="w-24 h-24 rounded-full bg-gray-800/80 flex items-center justify-center mx-auto mb-6 ring-4 ring-yellow-600/30">
                  <svg className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Host Not Broadcasting</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  The streamer may have disconnected or is experiencing technical issues.
                </p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-gray-800/80 flex items-center justify-center mx-auto mb-6 ring-4 ring-violet-600/30">
                  <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Connecting to Stream...</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Please wait while we connect you to the live stream.
                </p>
              </>
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
