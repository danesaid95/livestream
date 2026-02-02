"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, Users, Video, Bell, BellOff, Search } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StreamCard } from "@/components/stream/stream-card";
import { useAuthStore } from "@/stores/auth";
import { usersApi, streamsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FollowedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isLive: boolean;
  currentStreamId?: string;
  currentStreamTitle?: string;
}

interface Stream {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  category: string;
  viewerCount: number;
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

type TabType = "live" | "all";

export default function FollowingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [following, setFollowing] = useState<FollowedUser[]>([]);
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("live");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (user) {
          const response = await usersApi.getFollowing(user.id);
          setFollowing(response.data.data?.users || []);
        }
      } catch (error) {
        console.error("Failed to fetch following:", error);
        setFollowing([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, router, user]);

  const liveFollowing = following.filter((f) => f.isLive);
  const offlineFollowing = following.filter((f) => !f.isLive);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Following</h1>
          <p className="text-gray-400">
            Keep up with creators you follow
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800 mb-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("live")}
              className={cn(
                "pb-4 text-sm font-medium transition-colors relative",
                activeTab === "live"
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Live Now
                {liveFollowing.length > 0 && (
                  <Badge className="bg-red-600 text-xs">
                    {liveFollowing.length}
                  </Badge>
                )}
              </div>
              {activeTab === "live" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "pb-4 text-sm font-medium transition-colors relative",
                activeTab === "all"
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                All Following
                <span className="text-gray-500">({following.length})</span>
              </div>
              {activeTab === "all" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
              )}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-900 rounded-lg aspect-video animate-pulse"
              />
            ))}
          </div>
        ) : following.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Not following anyone yet
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Follow creators to see their streams here and get notified when they go live.
            </p>
            <Button
              onClick={() => router.push("/browse")}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Search className="w-4 h-4 mr-2" />
              Discover Creators
            </Button>
          </div>
        ) : (
          <>
            {activeTab === "live" && (
              <>
                {liveFollowing.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Video className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No one is live right now
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Check back later or browse other live streams
                    </p>
                    <Button
                      onClick={() => router.push("/browse")}
                      variant="outline"
                    >
                      Browse All Streams
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {liveFollowing.map((creator) => (
                      <Card
                        key={creator.id}
                        className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors"
                        onClick={() => router.push(`/stream/${creator.currentStreamId}`)}
                      >
                        <div className="aspect-video bg-gray-800 relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Avatar
                              src={creator.avatarUrl}
                              fallback={creator.displayName?.substring(0, 2) || "??"}
                              size="xl"
                            />
                          </div>
                          <Badge className="absolute top-2 left-2 bg-red-600 animate-pulse">
                            LIVE
                          </Badge>
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-white truncate">
                            {creator.currentStreamTitle || "Untitled Stream"}
                          </h3>
                          <p className="text-sm text-gray-400">{creator.displayName}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "all" && (
              <div className="space-y-6">
                {/* Live Creators */}
                {liveFollowing.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      Live Now
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {liveFollowing.map((creator) => (
                        <button
                          key={creator.id}
                          onClick={() => router.push(`/stream/${creator.currentStreamId}`)}
                          className="flex flex-col items-center text-center group"
                        >
                          <div className="relative mb-2">
                            <Avatar
                              src={creator.avatarUrl}
                              fallback={creator.displayName?.substring(0, 2) || "??"}
                              size="lg"
                              className="ring-2 ring-red-500 ring-offset-2 ring-offset-gray-950"
                            />
                            <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-[10px] px-1.5">
                              LIVE
                            </Badge>
                          </div>
                          <span className="text-sm font-medium text-white group-hover:text-violet-400 truncate w-full">
                            {creator.displayName}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offline Creators */}
                {offlineFollowing.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Offline
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {offlineFollowing.map((creator) => (
                        <button
                          key={creator.id}
                          onClick={() => router.push(`/profile/${creator.username}`)}
                          className="flex flex-col items-center text-center group"
                        >
                          <Avatar
                            src={creator.avatarUrl}
                            fallback={creator.displayName?.substring(0, 2) || "??"}
                            size="lg"
                            className="mb-2 opacity-60 group-hover:opacity-100 transition-opacity"
                          />
                          <span className="text-sm font-medium text-gray-400 group-hover:text-white truncate w-full">
                            {creator.displayName}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
