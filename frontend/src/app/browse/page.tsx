"use client";

import { useState, useEffect } from "react";
import { Search, Filter, TrendingUp, Clock, Users, Grid, List } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StreamCard } from "@/components/stream/stream-card";
import { streamsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

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

const CATEGORIES = [
  { id: "all", name: "All", icon: Grid },
  { id: "gaming", name: "Gaming", emoji: "🎮" },
  { id: "music", name: "Music", emoji: "🎵" },
  { id: "talk-show", name: "Talk Show", emoji: "🎙️" },
  { id: "education", name: "Education", emoji: "📚" },
  { id: "sports", name: "Sports", emoji: "⚽" },
  { id: "creative", name: "Creative", emoji: "🎨" },
  { id: "lifestyle", name: "Lifestyle", emoji: "✨" },
  { id: "other", name: "Other", emoji: "🔮" },
];

const SORT_OPTIONS = [
  { id: "viewers", name: "Most Viewers", icon: Users },
  { id: "trending", name: "Trending", icon: TrendingUp },
  { id: "recent", name: "Recently Started", icon: Clock },
];

export default function BrowsePage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("viewers");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const fetchStreams = async () => {
      setIsLoading(true);
      try {
        const category = selectedCategory === "all" ? undefined : selectedCategory;
        const response = await streamsApi.getLive(1, 50, category);
        setStreams(response.data.data?.streams || []);
      } catch (error) {
        console.error("Failed to fetch streams:", error);
        setStreams([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreams();
  }, [selectedCategory]);

  const filteredStreams = streams.filter((stream) =>
    stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stream.user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedStreams = [...filteredStreams].sort((a, b) => {
    switch (selectedSort) {
      case "viewers":
        return b.viewerCount - a.viewerCount;
      case "recent":
        return 0; // Would sort by startedAt if available
      default:
        return b.viewerCount - a.viewerCount;
    }
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Browse Streams</h1>
          <p className="text-gray-400">
            Discover live content from creators around the world
          </p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search streams or creators..."
              className="pl-10 bg-gray-900 border-gray-800"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            {SORT_OPTIONS.map((option) => (
              <Button
                key={option.id}
                onClick={() => setSelectedSort(option.id)}
                variant={selectedSort === option.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  selectedSort === option.id
                    ? "bg-violet-600 hover:bg-violet-700"
                    : "text-gray-400"
                )}
              >
                <option.icon className="w-4 h-4 mr-2" />
                {option.name}
              </Button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Categories Sidebar */}
          <div className="hidden lg:block w-56 flex-shrink-0">
            <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
              Categories
            </h3>
            <div className="space-y-1">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                    selectedCategory === category.id
                      ? "bg-violet-600/20 text-violet-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  {category.icon ? (
                    <category.icon className="w-5 h-5" />
                  ) : (
                    <span className="text-lg">{category.emoji}</span>
                  )}
                  <span className="text-sm font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Categories */}
          <div className="lg:hidden w-full mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-shrink-0",
                    selectedCategory === category.id
                      ? "bg-violet-600 hover:bg-violet-700"
                      : ""
                  )}
                >
                  {category.emoji || <Grid className="w-4 h-4 mr-1" />}
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Streams Grid */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div
                className={cn(
                  "gap-4",
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                    : "flex flex-col"
                )}
              >
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-900 rounded-lg aspect-video animate-pulse"
                  />
                ))}
              </div>
            ) : sortedStreams.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  No streams found
                </h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : "No live streams in this category right now"}
                </p>
                {selectedCategory !== "all" && (
                  <Button
                    onClick={() => setSelectedCategory("all")}
                    variant="outline"
                  >
                    Browse all categories
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">
                    {sortedStreams.length} streams live
                  </p>
                </div>
                <div
                  className={cn(
                    "gap-4",
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                      : "flex flex-col"
                  )}
                >
                  {sortedStreams.map((stream) => (
                    <StreamCard
                      key={stream.id}
                      id={stream.id}
                      title={stream.title}
                      thumbnailUrl={stream.thumbnailUrl || undefined}
                      category={stream.category}
                      viewerCount={stream.viewerCount}
                      streamerName={stream.user.displayName}
                      streamerAvatar={stream.user.avatarUrl || undefined}
                      isLive={true}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
