export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: 'user' | 'creator' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  pointBalance: number;
  followerCount: number;
  followingCount: number;
  isVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Stream {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  category: StreamCategory;
  channelName: string;
  viewerCount: number;
  peakViewerCount: number;
  totalViews: number;
  totalGiftsReceived: number;
  likeCount: number;
  isMature: boolean;
  chatEnabled: boolean;
  tags: string[] | null;
  scheduledStartAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationInSeconds: number | null;
  recordingUrl: string | null;
  userId: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export type StreamCategory =
  | 'gaming'
  | 'music'
  | 'talk_show'
  | 'education'
  | 'sports'
  | 'creative'
  | 'lifestyle'
  | 'other';

export interface Gift {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string;
  animationUrl: string | null;
  pointCost: number;
  creatorEarnings: number;
  tier: 'basic' | 'standard' | 'premium' | 'legendary';
  isActive: boolean;
  sortOrder: number;
}

export interface GiftTransaction {
  id: string;
  senderId: string;
  receiverId: string;
  giftId: string;
  streamId: string | null;
  quantity: number;
  pointsSpent: number;
  creatorEarnings: number;
  message: string | null;
  sender: User;
  receiver: User;
  gift: Gift;
  createdAt: string;
}

export interface PointPackage {
  id: string;
  name: string;
  description: string | null;
  points: number;
  bonusPoints: number;
  priceUsd: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  badgeText: string | null;
}

export interface PointTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'gift_sent' | 'gift_received' | 'bonus' | 'refund' | 'withdrawal' | 'daily_reward';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  timestamp: string;
  isCreator: boolean;
  isVerified: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
