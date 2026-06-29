import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Camera, BadgeCheck } from 'lucide-react';
import type { User } from '@/lib/types';
import { getMediaUrl } from '@/lib/strapi';
import { formatPrice, getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge, Tag, Rating } from '@/components/ui';

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
      <div className="relative h-52 bg-gradient-brand">
        {user.coverPhoto ? (
          <Image
            src={getMediaUrl(user.coverPhoto.url)}
            alt={user.displayName || user.username}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-brand opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />

        {/* Avatar */}
        <div className="absolute -bottom-6 left-5">
          <div className="relative h-16 w-16 rounded-2xl ring-4 ring-cream-50 overflow-hidden shadow-soft">
            {user.avatar ? (
              <Image
                src={getMediaUrl(user.avatar.url)}
                alt={user.displayName || user.username}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="h-full w-full bg-gradient-brand flex items-center justify-center text-cream font-bold text-xl">
                {getInitials(user.displayName || user.username)}
              </div>
            )}
          </div>
        </div>

        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <Badge tone="glass">
            <Camera className="h-3 w-3" />
            {typeLabel[user.userType] || user.userType}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="px-5 pt-9 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-lg font-semibold text-ink truncate">
                {user.displayName || user.username}
              </h3>
              {user.isVerified && (
                <BadgeCheck className="h-4 w-4 flex-shrink-0 text-gold-500" />
              )}
            </div>
            {user.location && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-ink-300">
                <MapPin className="h-3 w-3" />
                {user.city || user.location}
              </div>
            )}
          </div>
          {user.rating > 0 && <Rating value={user.rating} count={user.totalReviews} />}
        </div>

        {user.bio && (
          <p className="mt-2 text-sm text-ink-500 line-clamp-2">
            {user.bio}
          </p>
        )}

        {/* Specializations */}
        {user.specializations && user.specializations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(user.specializations as string[]).slice(0, 3).map((s) => (
              <Tag key={s} className="bg-gold-100 text-gold-600">{s}</Tag>
            ))}
            {user.specializations.length > 3 && (
              <Tag>+{user.specializations.length - 3}</Tag>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-sand-300 flex items-center justify-between">
          {user.pricePerHour ? (
            <div>
              <span className="text-xs text-ink-300">From</span>
              <p className="text-sm font-bold text-ink">
                {formatPrice(user.pricePerHour, user.currency)}<span className="font-normal text-ink-300">/hr</span>
              </p>
            </div>
          ) : (
            <span className="text-sm text-ink-300">Price on request</span>
          )}
          <Badge
            tone={user.isAvailable ? 'success' : 'neutral'}
            className={cn(!user.isAvailable && 'text-ink-300')}
          >
            {user.isAvailable ? '● Available' : '○ Busy'}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
