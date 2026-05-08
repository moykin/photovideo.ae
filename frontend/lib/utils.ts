import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = 'AED'): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string, fmt = 'MMM d, yyyy'): string {
  return format(new Date(date), fmt);
}

export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const SPECIALIZATIONS = [
  'Wedding', 'Portrait', 'Commercial', 'Fashion', 'Sports',
  'Event', 'Landscape', 'Street', 'Product', 'Real Estate',
  'Videography', 'Aerial/Drone', 'Architecture', 'Food',
  'Travel', 'Corporate', 'Music Video', 'Short Film',
];

export const LANGUAGES = [
  'English', 'Arabic', 'Russian', 'Hindi', 'Urdu',
  'French', 'Spanish', 'Chinese', 'Filipino', 'Malayalam',
];

export function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function bookingStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    pending:     { label: 'Pending',     color: 'text-yellow-500 bg-yellow-500/10' },
    confirmed:   { label: 'Confirmed',   color: 'text-green-500 bg-green-500/10' },
    in_progress: { label: 'In Progress', color: 'text-blue-500 bg-blue-500/10' },
    completed:   { label: 'Completed',   color: 'text-emerald-500 bg-emerald-500/10' },
    cancelled:   { label: 'Cancelled',   color: 'text-red-500 bg-red-500/10' },
    rejected:    { label: 'Rejected',    color: 'text-gray-500 bg-gray-500/10' },
  };
  return map[status] ?? { label: status, color: 'text-gray-500 bg-gray-500/10' };
}
