'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Plus, Menu, X, LogOut, User, Settings, Coins, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth';
import { cn, formatNumber } from '@/lib/utils';
import { usersApi } from '@/lib/api';
import { User as UserType } from '@/types';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch suggested users on mount
  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const response = await usersApi.getSuggested(5);
        setSuggestedUsers(response.data.data?.users || response.data.users || []);
      } catch (error) {
        console.error('Failed to fetch suggested users:', error);
      }
    };
    fetchSuggested();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await usersApi.search(searchQuery, 1, 8);
        setSearchResults(response.data.data?.users || response.data.users || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserSelect = (username: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    router.push(`/profile/${username}`);
  };

  const displayUsers = searchQuery.trim() ? searchResults : suggestedUsers;

  const navLinks = [
    { href: '/', label: 'Discover' },
    { href: '/browse', label: 'Browse' },
    { href: '/following', label: 'Following' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-600">
              <span className="text-lg font-bold text-white">L</span>
            </div>
            <span className="hidden text-xl font-bold text-white sm:block">LiveStream</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden flex-1 max-w-md mx-8 md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchDropdown(true)}
              className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 pl-10 pr-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 animate-spin" />
            )}

            {/* Search Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden z-50">
                <div className="p-2">
                  <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {searchQuery.trim() ? 'Search Results' : 'Suggested Creators'}
                  </p>
                  {displayUsers.length > 0 ? (
                    <div className="space-y-1">
                      {displayUsers.map((searchUser) => (
                        <button
                          key={searchUser.id}
                          onClick={() => handleUserSelect(searchUser.username)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-800 transition-colors"
                        >
                          <Avatar
                            src={searchUser.avatarUrl}
                            fallback={searchUser.displayName || searchUser.username}
                            size="sm"
                          />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-white">
                              {searchUser.displayName || searchUser.username}
                            </p>
                            <p className="text-xs text-gray-400">
                              @{searchUser.username} · {formatNumber(searchUser.followerCount)} followers
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim() ? (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">
                      No creators found for "{searchQuery}"
                    </p>
                  ) : (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">
                      Start typing to search for creators
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <Link href="/stream/create" className="hidden sm:block">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Go Live
                </Button>
              </Link>

              <Link href="/points" className="hidden items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-gray-100 hover:bg-gray-700 sm:flex">
                <Coins className="h-4 w-4 text-yellow-500" />
                {formatNumber(user.pointBalance)}
              </Link>

              <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-800"
                >
                  <Avatar
                    src={user.avatarUrl}
                    fallback={user.displayName || user.username}
                    size="sm"
                  />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-lg">
                      <div className="border-b border-gray-800 px-4 py-3">
                        <p className="text-sm font-medium text-white">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-gray-400">@{user.username}</p>
                      </div>
                      <Link
                        href={`/profile/${user.username}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Your Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <div className="border-t border-gray-800 mt-1">
                        <button
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                        >
                          <LogOut className="h-4 w-4" />
                          Log out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}

          <button
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-gray-800 bg-gray-950 md:hidden">
          <div className="container mx-auto px-4 py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="search"
                placeholder="Search creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 pl-10 pr-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none"
              />
              {/* Mobile Search Results */}
              {showSearchDropdown && displayUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden z-50">
                  <div className="p-2 space-y-1">
                    {displayUsers.slice(0, 5).map((searchUser) => (
                      <button
                        key={searchUser.id}
                        onClick={() => {
                          handleUserSelect(searchUser.username);
                          setMobileMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-800 transition-colors"
                      >
                        <Avatar
                          src={searchUser.avatarUrl}
                          fallback={searchUser.displayName || searchUser.username}
                          size="sm"
                        />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-white">
                            {searchUser.displayName || searchUser.username}
                          </p>
                          <p className="text-xs text-gray-400">@{searchUser.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
