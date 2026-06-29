import axios from 'axios';
import type { StrapiListResponse, StrapiSingleResponse } from './types';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || '';

export const strapi = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

strapi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwt');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

strapi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

// Resolve media URL → CloudFront CDN in production
export function getMediaUrl(url?: string): string {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return CDN_URL ? url.replace(STRAPI_URL, CDN_URL) : url;
  return CDN_URL ? `${CDN_URL}${url}` : `${STRAPI_URL}${url}`;
}

// ── Featured Creators (платное размещение) ─────────────────────────────────
// Возвращает пользователей у которых featuredUntil > now, отсортированных по featuredOrder.
// Используется на главной странице в промо-блоке.
export async function getFeaturedCreators(limit = 4) {
  const now = new Date().toISOString();
  const res = await strapi.get<import('./types').User[]>('/users', {
    params: {
      'filters[featuredUntil][$gt]': now,
      'filters[confirmed]': true,
      'populate': 'avatar,coverPhoto',
      'sort': 'featuredOrder:asc',
      'pagination[pageSize]': limit,
    },
  });
  return res.data;
}

// ── Photographers / Videographers ──────────────────────────────────────────
export async function getPhotographers(params?: Record<string, unknown>) {
  const res = await strapi.get<StrapiListResponse<import('./types').User>>('/users', {
    params: {
      'filters[userType][$in][0]': 'photographer',
      'filters[userType][$in][1]': 'both',
      'filters[confirmed]': true,
      'populate': 'avatar,socialLinks',
      'sort': 'rating:desc',
      'pagination[pageSize]': 12,
      ...params,
    },
  });
  return res.data;
}

export async function getVideographers(params?: Record<string, unknown>) {
  const res = await strapi.get<StrapiListResponse<import('./types').User>>('/users', {
    params: {
      'filters[userType][$in][0]': 'videographer',
      'filters[userType][$in][1]': 'both',
      'filters[confirmed]': true,
      'populate': 'avatar,socialLinks',
      'sort': 'rating:desc',
      'pagination[pageSize]': 12,
      ...params,
    },
  });
  return res.data;
}

export async function getUserBySlug(slug: string) {
  const res = await strapi.get(`/users`, {
    params: {
      'filters[slug]': slug,
      'populate': 'avatar,coverPhoto,socialLinks,portfolios.coverImage',
    },
  });
  return res.data?.[0] ?? null;
}

// ── Portfolio ──────────────────────────────────────────────────────────────
export async function getPortfolios(params?: Record<string, unknown>) {
  const res = await strapi.get<StrapiListResponse<import('./types').Portfolio>>('/portfolios', {
    params: {
      populate: 'coverImage,author.avatar',
      sort: 'createdAt:desc',
      'pagination[pageSize]': 24,
      ...params,
    },
  });
  return res.data;
}

export async function getPortfolio(id: number | string) {
  const res = await strapi.get<StrapiSingleResponse<import('./types').Portfolio>>(
    `/portfolios/${id}`,
    { params: { populate: 'coverImage,media,author.avatar,author.socialLinks' } }
  );
  return res.data.data;
}

// ── Feed Posts ─────────────────────────────────────────────────────────────
export async function getFeedPosts(params?: Record<string, unknown>) {
  const res = await strapi.get<StrapiListResponse<import('./types').FeedPost>>('/feed-posts', {
    params: {
      populate: 'media,author.avatar',
      sort: 'createdAt:desc',
      'pagination[pageSize]': 20,
      ...params,
    },
  });
  return res.data;
}

export async function likeFeedPost(id: number | string) {
  const res = await strapi.post(`/feed-posts/${id}/like`);
  return res.data;
}

// ── Articles ───────────────────────────────────────────────────────────────
export async function getArticles(params?: Record<string, unknown>) {
  const res = await strapi.get<StrapiListResponse<import('./types').Article>>('/articles', {
    params: {
      populate: 'cover,author.avatar',
      sort: 'publishedAt:desc',
      'pagination[pageSize]': 10,
      ...params,
    },
  });
  return res.data;
}

export async function getArticle(slug: string) {
  const res = await strapi.get<StrapiListResponse<import('./types').Article>>('/articles', {
    params: {
      'filters[slug]': slug,
      populate: 'cover,author.avatar,seo',
    },
  });
  return res.data.data?.[0] ?? null;
}

// ── Bookings ───────────────────────────────────────────────────────────────
export async function createBooking(data: import('./types').BookingFormData) {
  const res = await strapi.post('/bookings', { data });
  return res.data.data;
}

export async function getMyBookings(asRole: 'client' | 'provider') {
  const field = asRole === 'client' ? 'bookingsAsClient' : 'bookingsAsProvider';
  const res = await strapi.get('/bookings', {
    params: {
      [`filters[${asRole === 'client' ? 'client' : 'provider'}][id]`]: 'me',
      populate: 'client.avatar,provider.avatar,review',
      sort: 'createdAt:desc',
    },
  });
  return res.data;
}

export async function updateBookingStatus(
  id: number | string,
  status: string,
  notes?: string
) {
  const res = await strapi.patch(`/bookings/${id}/status`, { status, notes });
  return res.data;
}

// ── Auth ───────────────────────────────────────────────────────────────────
export async function login(identifier: string, password: string) {
  const res = await strapi.post('/auth/local', { identifier, password });
  return res.data;
}

export async function register(data: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  userType?: string;
}) {
  const res = await strapi.post('/auth/local/register', data);
  return res.data;
}

export async function forgotPassword(email: string) {
  const res = await strapi.post('/auth/forgot-password', { email });
  return res.data;
}

export async function resetPassword(code: string, password: string, passwordConfirmation: string) {
  const res = await strapi.post('/auth/reset-password', { code, password, passwordConfirmation });
  return res.data;
}

export async function updateMe(data: Record<string, unknown>, userId?: number) {
  // PUT /users/me требует разрешение updateMe в Strapi Admin.
  // Используем PUT /users/:id — требует только разрешение update,
  // которое Strapi ограничивает: пользователь может обновлять только себя.
  if (userId) {
    const res = await strapi.put(`/users/${userId}`, data);
    return res.data;
  }
  const res = await strapi.put('/users/me', data);
  return res.data;
}

export async function getMe() {
  const res = await strapi.get('/users/me', {
    params: { populate: 'avatar,coverPhoto,socialLinks' },
  });
  return res.data;
}

// ── Reviews ────────────────────────────────────────────────────────────────
export async function createReview(data: {
  booking: number;
  rating: number;
  comment?: string;
}) {
  const res = await strapi.post('/reviews', { data });
  return res.data.data;
}

export async function getProviderReviews(providerId: number | string) {
  const res = await strapi.get('/reviews', {
    params: {
      'filters[provider][id]': providerId,
      'filters[isPublic]': true,
      populate: 'author.avatar',
      sort: 'createdAt:desc',
    },
  });
  return res.data;
}
