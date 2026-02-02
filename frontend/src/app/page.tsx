'use client';

import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { StreamCard } from '@/components/stream/stream-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { streamsApi } from '@/lib/api';
import { Stream, StreamCategory } from '@/types';
import { getCategoryLabel, cn } from '@/lib/utils';

const categories: StreamCategory[] = [
  'gaming',
  'music',
  'talk_show',
  'education',
  'sports',
  'creative',
  'lifestyle',
  'other',
];

export default function HomePage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<StreamCategory | null>(null);

  useEffect(() => {
    const fetchStreams = async () => {
      setIsLoading(true);
      try {
        const response = await streamsApi.getLive(1, 20, selectedCategory || undefined);
        setStreams(response.data.data.streams || []);
      } catch (error) {
        console.error('Failed to fetch streams:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreams();
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 p-8 md:p-12">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/80">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">Welcome to LiveStream</span>
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Discover Amazing Live Content
              </h1>
              <p className="mt-3 max-w-xl text-lg text-white/80">
                Watch your favorite creators stream live, send gifts, and join the conversation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" className="bg-white text-violet-600 hover:bg-gray-100">
                  Start Watching
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Go Live
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                selectedCategory === null
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              )}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  selectedCategory === category
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                )}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-semibold text-white">
                {selectedCategory ? getCategoryLabel(selectedCategory) : 'Live Now'}
              </h2>
              {streams.length > 0 && (
                <Badge variant="secondary">{streams.length} streams</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video rounded-lg bg-gray-800" />
                  <div className="mt-3 flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-gray-800" />
                      <div className="h-3 w-1/2 rounded bg-gray-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : streams.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {streams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900/50 py-16">
              <TrendingUp className="h-12 w-12 text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-300">No live streams</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedCategory
                  ? `No one is streaming in ${getCategoryLabel(selectedCategory)} right now`
                  : 'Check back later for live content'}
              </p>
              <Button className="mt-4" onClick={() => setSelectedCategory(null)}>
                Browse all categories
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
