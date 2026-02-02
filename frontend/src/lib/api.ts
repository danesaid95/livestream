import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken, user } = useAuthStore.getState();
        if (refreshToken && user) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            userId: user.id,
            refreshToken,
          });

          const { tokens } = response.data.data;
          useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; username: string; password: string; displayName?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  getById: (id: string) => api.get(`/users/${id}`),
  getByUsername: (username: string) => api.get(`/users/username/${username}`),
  updateProfile: (data: { username?: string; displayName?: string; bio?: string; avatarUrl?: string; bannerUrl?: string }) =>
    api.put('/users/profile', data),
  follow: (id: string) => api.post(`/users/${id}/follow`),
  unfollow: (id: string) => api.delete(`/users/${id}/follow`),
  getFollowStatus: (id: string) => api.get(`/users/${id}/follow/status`),
  getFollowers: (id: string, page = 1, limit = 20) =>
    api.get(`/users/${id}/followers`, { params: { page, limit } }),
  getFollowing: (id: string, page = 1, limit = 20) =>
    api.get(`/users/${id}/following`, { params: { page, limit } }),
  search: (q: string, page = 1, limit = 20) =>
    api.get('/users/search', { params: { q, page, limit } }),
  getSuggested: (limit = 5) =>
    api.get('/users/suggested', { params: { limit } }),
};

export const streamsApi = {
  create: (data: { title: string; description?: string; category?: string; tags?: string[] }) =>
    api.post('/streams', data),
  getLive: (page = 1, limit = 20, category?: string) =>
    api.get('/streams/live', { params: { page, limit, category } }),
  getById: (id: string) => api.get(`/streams/${id}`),
  getUserStreams: (userId: string, page = 1, limit = 20) =>
    api.get(`/streams/user/${userId}`, { params: { page, limit } }),
  update: (id: string, data: { title?: string; description?: string; category?: string }) =>
    api.put(`/streams/${id}`, data),
  start: (id: string) => api.post(`/streams/${id}/start`),
  end: (id: string) => api.post(`/streams/${id}/end`),
  getViewerToken: (id: string) => api.get(`/streams/${id}/token`),
  join: (id: string) => api.post(`/streams/${id}/join`),
  leave: (id: string) => api.post(`/streams/${id}/leave`),
  updateThumbnail: (id: string, imageData: string) => api.post(`/streams/${id}/thumbnail`, { imageData }),
};

export const giftsApi = {
  list: () => api.get('/gifts'),
  getAll: () => api.get('/gifts'),
  send: (streamId: string, giftId: string, quantity: number) =>
    api.post('/gifts/send', { giftId, streamId, quantity }),
  sendToUser: (data: { giftId: string; receiverId: string; streamId?: string; quantity: number; message?: string }) =>
    api.post('/gifts/send', data),
  getLeaderboard: (streamId?: string, limit = 10) =>
    api.get('/gifts/leaderboard', { params: { streamId, limit } }),
  getSentHistory: (page = 1, limit = 20) =>
    api.get('/gifts/history/sent', { params: { page, limit } }),
  getReceivedHistory: (page = 1, limit = 20) =>
    api.get('/gifts/history/received', { params: { page, limit } }),
  getEarnings: () => api.get('/gifts/earnings'),
};

export const pointsApi = {
  getPackages: () => api.get('/points/packages'),
  getBalance: () => api.get('/points/balance'),
  createPaymentIntent: (packageId: string) => api.post('/points/purchase', { packageId }),
  confirmPayment: (paymentIntentId: string) => api.post('/points/confirm', { paymentIntentId }),
  getTransactions: (page = 1, limit = 20) =>
    api.get('/points/transactions', { params: { page, limit } }),
};
