import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, Camera, CheckCircle } from 'lucide-react';
import type { User } from '@/lib/types';
import { getMediaUrl } from '@/lib/strapi';
import { formatPrice, getInitials, formatRating } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props {
  user: User;
}

const typeLabel: Record<string, string> = {
  photographer: 'Photographer',
  videographer: 'Videographer',
  both: 'Photo & Video',
  client: 'Client',
};

export function PhotographerCard({ user }: Props) {
  return (
    <Link href={`/profile/${user.slug || user.username}`} className="card-hover block group">
      {/* Cover / Avatar */}
      <div className="relative h-52 bg-gradient-to-br from-brand-900 to-gray-900">
        {user.coverPhoto ? (
          <Image
            src={getMediaUrl(user.coverPhoto.url)}
            alt={user.displayName || user.username}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-800/40 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Avatar */}
        <div className="absolute -bottom-6 left-5">
          <div className="relative h-16 w-16 rounded-2xl ring-3 ring-white dark:ring-gray-900 overflow-hidden shadow-lg">
            {user.avatar ? (
              <Image
                src={getMediaUrl(user.avatar.url)}
                alt={user.displayName || user.username}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="h-full w-full bg-gradient-brand flex items-center justify-center text-white font-bold text-xl">
                {getInitials(user.displayName || user.username)}
              </div>
            )}
          </div>
        </div>

        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <span className="badge bg-black/50 text-white backdrop-blur-sm">
            <Camera className="h-3 w-3 mr-1" />
            {typeLabel[user.userType] || user.userType}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-5 pt-9 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {user.displayName || user.username}
              </h3>
              {user.isVerified && (
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-brand-500" />
              )}
            </div>
            {user.location && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                <MapPin className="h-3 w-3" />
                {user.city || user.location}
              </div>
            )}
          </div>
          {user.rating > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="h-4 w-4 fill-gold-400 text-gold-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatRating(user.rating)}
              </span>
              <span className="text-xs text-gray-400">({user.totalReviews})</span>
            </div>
          )}
        </div>

        {user.bio && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {user.bio}
          </p>
        )}

        {/* Specializations */}
        {user.specializations && user.specializations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(user.specializations as string[]).slice(0, 3).map((s) => (
              <span key={s} className="badge bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-300">
                {s}
              </span>
            ))}
            {user.specializations.length > 3 && (
              <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500">
                +{user.specializations.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          {user.pricePerHour ? (
            <div>
              <span className="text-xs text-gray-400">From</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {formatPrice(user.pricePerHour, user.currency)}<span className="font-normal text-gray-400">/hr</span>
              </p>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Price on request</span>
          )}
          <span
            className={cn(
              'badge',
              user.isAvailable
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            )}
          >
            {user.isAvailable ? '● Available' : '○ Busy'}
          </span>
        </div>
      </div>
    </Link>
  );
}
