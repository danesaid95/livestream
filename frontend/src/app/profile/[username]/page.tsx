"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Heart,
  Users,
  Video,
  Settings,
  Share2,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Gift,
  Sparkles,
  ChevronLeft,
  MoreHorizontal,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StreamCard } from "@/components/stream/stream-card";
import { useAuthStore } from "@/stores/auth";
import { usersApi, streamsApi } from "@/lib/api";
import { Stream } from "@/types";

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  followerCount: number;
  followingCount: number;
  totalGiftsReceived: number;
  createdAt: string;
  isLive: boolean;
  currentStreamId?: string;
}

type TabType = "streams" | "about";
type StreamFilter = "all" | "live" | "past";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { user: currentUser, isAuthenticated } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("streams");
  const [streamFilter, setStreamFilter] = useState<StreamFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const filteredStreams = streams.filter((stream) => {
    if (streamFilter === "all") return true;
    if (streamFilter === "live") return stream.status === "live";
    if (streamFilter === "past") return stream.status === "ended";
    return true;
  });

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await usersApi.getByUsername(username);
        const profileData = response.data.data;
        setProfile(profileData);

        // Fetch user's streams
        const streamsResponse = await streamsApi.getUserStreams(profileData.id);
        setStreams(streamsResponse.data.data?.streams || []);

        // Check if current user is following this profile
        if (isAuthenticated && currentUser?.id !== profileData.id) {
          try {
            const followResponse = await usersApi.getFollowStatus(profileData.id);
            setIsFollowing(followResponse.data.data?.isFollowing || false);
          } catch {
            // Ignore errors when checking follow status
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setError("User not found");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username, isAuthenticated, currentUser?.id]);

  const handleFollow = async () => {
    if (!isAuthenticated || !profile || isFollowLoading) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await usersApi.unfollow(profile.id);
        setIsFollowing(false);
        setProfile((prev) =>
          prev ? { ...prev, followerCount: prev.followerCount - 1 } : null
        );
      } else {
        await usersApi.follow(profile.id);
        setIsFollowing(true);
        setProfile((prev) =>
          prev ? { ...prev, followerCount: prev.followerCount + 1 } : null
        );
      }
    } catch (err) {
      console.error("Failed to follow/unfollow:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: profile?.displayName,
        text: `Check out ${profile?.displayName} on LiveStream!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h1 className="text-2xl font-bold text-white mb-4">{error || "User not found"}</h1>
          <Button onClick={() => router.push("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-violet-900 via-purple-900 to-pink-900">
        {profile.bannerUrl && (
          <img
            src={profile.bannerUrl}
            alt="Banner"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="container mx-auto px-4 -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="relative">
              <Avatar
                src={profile.avatarUrl}
                fallback={profile.displayName?.substring(0, 2) || "??"}
                size="xl"
                className="w-32 h-32 md:w-40 md:h-40 border-4 border-gray-950"
              />
              {profile.isLive && (
                <Badge className="absolute bottom-2 right-2 bg-red-600 animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-4 md:pt-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-white truncate">
                    {profile.displayName}
                  </h1>
                  {profile.isLive && (
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => router.push(`/stream/${profile.currentStreamId}`)}
                    >
                      Watch Live
                    </Button>
                  )}
                </div>
                <p className="text-gray-400 mb-4">@{profile.username}</p>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <button className="hover:text-violet-400 transition-colors">
                    <span className="font-bold text-white">
                      {profile.followerCount.toLocaleString()}
                    </span>{" "}
                    <span className="text-gray-400">Followers</span>
                  </button>
                  <button className="hover:text-violet-400 transition-colors">
                    <span className="font-bold text-white">
                      {profile.followingCount.toLocaleString()}
                    </span>{" "}
                    <span className="text-gray-400">Following</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <Gift className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-white">
                      {(profile.totalGiftsReceived || 0).toLocaleString()}
                    </span>{" "}
                    <span className="text-gray-400">Gifts</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <Button
                    onClick={() => router.push("/settings/profile")}
                    variant="outline"
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      variant={isFollowing ? "outline" : "default"}
                      className={isFollowing ? "" : "bg-violet-600 hover:bg-violet-700"}
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
                    {isAuthenticated && (
                      <Button
                        onClick={() => router.push(`/gifts/send/${profile.username}`)}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Send Gift
                      </Button>
                    )}
                  </>
                )}
                <Button variant="ghost" size="icon" onClick={handleShare}>
                  <Share2 className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-gray-300 max-w-2xl">{profile.bio}</p>
            )}

            {/* Meta Info */}
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {formatDate(profile.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-gray-800">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("streams")}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === "streams"
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Streams
              </div>
              {activeTab === "streams" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === "about"
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              About
              {activeTab === "about" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {activeTab === "streams" && (
            <>
              {/* Stream Filter */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setStreamFilter("all")}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    streamFilter === "all"
                      ? "bg-violet-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStreamFilter("live")}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    streamFilter === "live"
                      ? "bg-red-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Live Now
                </button>
                <button
                  onClick={() => setStreamFilter("past")}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    streamFilter === "past"
                      ? "bg-violet-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Past Broadcasts
                </button>
              </div>

              {filteredStreams.length === 0 ? (
                <div className="text-center py-16">
                  <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {streamFilter === "live"
                      ? "Not live right now"
                      : streamFilter === "past"
                      ? "No past broadcasts"
                      : "No streams yet"}
                  </h3>
                  <p className="text-gray-400">
                    {streamFilter === "live"
                      ? `${profile.displayName} is not streaming right now.`
                      : streamFilter === "past"
                      ? `${profile.displayName} doesn't have any past broadcasts.`
                      : isOwnProfile
                      ? "Go live to share your first stream!"
                      : `${profile.displayName} hasn't streamed yet.`}
                  </p>
                  {isOwnProfile && streamFilter !== "past" && (
                    <Button
                      onClick={() => router.push("/stream/create")}
                      className="mt-4 bg-violet-600 hover:bg-violet-700"
                    >
                      Go Live
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredStreams.map((stream) => (
                    <StreamCard
                      key={stream.id}
                      stream={{
                        ...stream,
                        user: {
                          id: profile.id,
                          username: profile.username,
                          displayName: profile.displayName,
                          avatarUrl: profile.avatarUrl,
                          email: "",
                          bio: profile.bio,
                          bannerUrl: profile.bannerUrl,
                          role: "user",
                          status: "active",
                          pointBalance: 0,
                          followerCount: profile.followerCount,
                          followingCount: profile.followingCount,
                          isVerified: false,
                          emailVerified: false,
                          createdAt: profile.createdAt,
                          updatedAt: profile.createdAt,
                        },
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "about" && (
            <div className="max-w-2xl">
              <Card className="p-6 bg-gray-900 border-gray-800">
                <h3 className="text-lg font-semibold mb-4">About {profile.displayName}</h3>
                {profile.bio ? (
                  <p className="text-gray-300">{profile.bio}</p>
                ) : (
                  <p className="text-gray-500 italic">No bio yet.</p>
                )}

                <div className="mt-6 pt-6 border-t border-gray-800">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Stats</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-800 rounded-lg">
                      <Users className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">
                        {profile.followerCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">Followers</p>
                    </div>
                    <div className="text-center p-4 bg-gray-800 rounded-lg">
                      <Video className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">
                        {streams.length}
                      </p>
                      <p className="text-xs text-gray-400">Streams</p>
                    </div>
                    <div className="text-center p-4 bg-gray-800 rounded-lg">
                      <Gift className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">
                        {(profile.totalGiftsReceived || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">Gifts Received</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
