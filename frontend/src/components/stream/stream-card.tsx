"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Clock, Play } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Stream } from '@/types';
import { formatNumber, getCategoryLabel, getCategoryColor } from '@/lib/utils';

interface StreamCardProps {
  stream: Stream;
}

export function StreamCard({ stream }: StreamCardProps) {
  const [elapsedTime, setElapsedTime] = useState<string>('');

  const isLive = stream.status === 'live';
  const isEnded = stream.status === 'ended';
  const hasRecording = isEnded && stream.recordingUrl;

  // For ended streams, show the duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!stream.startedAt || stream.status !== 'live') return;

    const calculateElapsed = () => {
      const start = new Date(stream.startedAt!);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    setElapsedTime(calculateElapsed());

    const interval = setInterval(() => {
      setElapsedTime(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [stream.startedAt, stream.status]);

  // Determine the link URL based on stream status
  const streamUrl = isLive
    ? `/stream/${stream.id}`
    : hasRecording
      ? `/stream/${stream.id}/replay`
      : '#';

  // Don't render a link for ended streams without recordings
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isEnded && !hasRecording) {
      return <div className="cursor-not-allowed opacity-70">{children}</div>;
    }
    return <Link href={streamUrl}>{children}</Link>;
  };

  return (
    <div className="group block">
      <CardWrapper>
        <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-800">
          {stream.thumbnailUrl ? (
            <img
              src={stream.thumbnailUrl}
              alt={stream.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-900 via-violet-900/30 to-pink-900/30">
              {stream.user?.avatarUrl && (
                <img
                  src={stream.user.avatarUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-30 blur-xl scale-125"
                />
              )}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {(stream.user?.displayName || stream.user?.username || stream.title).charAt(0).toUpperCase()}
                  </span>
                </div>
                {isLive && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-medium text-white/80">Streaming</span>
                  </div>
                )}
                {isEnded && hasRecording && (
                  <div className="mt-2 flex items-center gap-1">
                    <Play className="h-4 w-4 text-white/80" />
                    <span className="text-xs font-medium text-white/80">Watch Replay</span>
                  </div>
                )}
                {isEnded && !hasRecording && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-white/60">No Recording</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          <div className="absolute left-2 top-2 flex items-center gap-2">
            {isLive && <Badge variant="live">LIVE</Badge>}
            {isEnded && hasRecording && (
              <Badge className="bg-violet-600">REPLAY</Badge>
            )}
            {isEnded && !hasRecording && (
              <Badge className="bg-gray-600">ENDED</Badge>
            )}
            <Badge className={getCategoryColor(stream.category)}>
              {getCategoryLabel(stream.category)}
            </Badge>
          </div>

          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
              <Eye className="h-3 w-3" />
              {isLive ? formatNumber(stream.viewerCount) : formatNumber(stream.totalViews)}
            </div>
            {isLive && elapsedTime && (
              <div className="flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                <Clock className="h-3 w-3" />
                {elapsedTime}
              </div>
            )}
            {isEnded && stream.durationInSeconds && (
              <div className="flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                <Clock className="h-3 w-3" />
                {formatDuration(stream.durationInSeconds)}
              </div>
            )}
          </div>
        </div>
      </CardWrapper>

      <div className="mt-3 flex gap-3">
        <Link href={`/profile/${stream.user.username}`}>
          <Avatar
            src={stream.user.avatarUrl}
            fallback={stream.user.displayName || stream.user.username}
            size="md"
            className="cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all"
          />
        </Link>
        <div className="flex-1 overflow-hidden">
          <Link href={`/stream/${stream.id}`}>
            <h3 className="truncate font-medium text-gray-100 group-hover:text-violet-400">
              {stream.title}
            </h3>
          </Link>
          <Link
            href={`/profile/${stream.user.username}`}
            className="truncate text-sm text-gray-400 hover:text-violet-400 transition-colors block"
          >
            {stream.user.displayName || stream.user.username}
          </Link>
          {stream.tags && stream.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {stream.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
