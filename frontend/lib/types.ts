// Strapi v5 flat response types

export type UserType = 'photographer' | 'videographer' | 'both' | 'client';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
export type ServiceType = 'photography' | 'videography' | 'both';
export type Currency = 'AED' | 'USD';

export type PortfolioCategory =
  | 'wedding' | 'portrait' | 'commercial' | 'fashion' | 'sports'
  | 'event' | 'landscape' | 'street' | 'product' | 'real_estate'
  | 'videography' | 'other';

export interface StrapiImage {
  id: number;
  documentId: string;
  url: string;
  alternativeText?: string;
  width: number;
  height: number;
  formats?: {
    thumbnail?: { url: string; width: number; height: number };
    small?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
  };
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  website?: string;
  linkedin?: string;
  behance?: string;
  vimeo?: string;
  telegram?: string;
  whatsapp?: string;
}

export interface User {
  id: number;
  documentId: string;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatar?: StrapiImage;
  coverPhoto?: StrapiImage;
  userType: UserType;
  location?: string;
  city?: string;
  country?: string;
  phone?: string;
  experience?: number;
  pricePerHour?: number;
  pricePerEvent?: number;
  currency: Currency;
  specializations?: string[];
  languages?: string[];
  equipment?: string;
  socialLinks?: SocialLinks;
  isVerified: boolean;
  isAvailable: boolean;
  rating: number;
  totalReviews: number;
  completedBookings: number;
  slug?: string;
  featuredUntil?: string;
  featuredOrder?: number;
}

export interface Portfolio {
  id: number;
  documentId: string;
  title: string;
  description?: string;
  coverImage: StrapiImage;
  media?: StrapiImage[];
  category: PortfolioCategory;
  tags?: string[];
  author: User;
  views: number;
  likes: number;
  isFeatured: boolean;
  location?: string;
  shootDate?: string;
  cameraGear?: string;
  publishedAt: string;
  createdAt: string;
}

export interface Article {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  cover?: StrapiImage;
  category: string;
  tags?: string[];
  author: User;
  views: number;
  featured: boolean;
  readTime?: number;
  publishedAt: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
  };
}

export interface FeedPost {
  id: number;
  documentId: string;
  caption?: string;
  media: StrapiImage[];
  author: User;
  tags?: string[];
  category: string;
  likes: number;
  commentsCount: number;
  location?: string;
  isFeatured: boolean;
  publishedAt: string;
  createdAt: string;
}

export interface Booking {
  id: number;
  documentId: string;
  referenceCode: string;
  client: User;
  provider: User;
  serviceType: ServiceType;
  eventType: string;
  eventDate: string;
  duration: number;
  location: string;
  city: string;
  agreedPrice?: number;
  currency: Currency;
  status: BookingStatus;
  clientNotes?: string;
  providerNotes?: string;
  cancellationReason?: string;
  review?: Review;
  createdAt: string;
}

export interface Review {
  id: number;
  documentId: string;
  rating: number;
  comment?: string;
  author: User;
  provider: User;
  isPublic: boolean;
  photos?: StrapiImage[];
  createdAt: string;
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiSingleResponse<T> {
  data: T;
}

export interface BookingFormData {
  provider: number;
  serviceType: ServiceType;
  eventType: string;
  eventDate: string;
  duration: number;
  location: string;
  city: string;
  clientNotes?: string;
}
