'use client';

/**
 * FeaturedCreatorCard — карточка для промо-блока главной страницы
 *
 * v2.0 — warm editorial redesign: тёмная карточка (ink) с золотыми акцентами,
 *         cover photo или avatar, тип (фото/видео/оба), рейтинг, цена,
 *         бейдж Featured, кнопки "Book" и "Profile".
 */

import Image from 'next/image';
import Link from 'next/link';
import { Star, Camera, Video, MapPin, BadgeCheck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { getMediaUrl } from '@/lib/strapi';
import type { User } from '@/lib/types';
import { BookingModal } from '@/components/booking/BookingModal';
import { useState } from 'react';

interface Props {
  creator: User;
}

// Метка типа специалиста
function TypeBadge({ userType }: { userType: User['userType'] }) {
  if (userType === 'photographer') return (
    <span className="flex items-center gap-1 rounded-pill bg-gold-500/15 border border-gold-500/30 px-2.5 py-1 text-xs font-medium text-gold-300">
      <Camera className="h-3 w-3" /> Photographer
    </span>
  );
  if (userType === 'videographer') return (
    <span className="flex items-center gap-1 rounded-pill bg-cream/10 border border-cream/20 px-2.5 py-1 text-xs font-medium text-cream-200">
      <Video className="h-3 w-3" /> Videographer
    </span>
  );
  return (
    <span className="flex items-center gap-1 rounded-pill bg-gold-500/15 border border-gold-500/30 px-2.5 py-1 text-xs font-medium text-gold-300">
      <Camera className="h-3 w-3" /><Video className="h-3 w-3" /> Photo & Video
    </span>
  );
}

export function FeaturedCreatorCard({ creator }: Props) {
  const [bookingOpen, setBookingOpen] = useState(false);

  const coverUrl = creator.coverPhoto
    ? getMediaUrl(creator.coverPhoto.url)
    : creator.avatar
      ? getMediaUrl(creator.avatar.url)
      : null;

  const displayName = creator.displayName || creator.username;
  const price = creator.pricePerHour ?? creator.pricePerEvent;
  const priceLabel = creator.pricePerHour ? '/hr' : creator.pricePerEvent ? '/event' : null;

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl bg-ink border border-ink-700 hover:border-gold-500/50 transition-all duration-300 hover:shadow-card hover:-translate-y-1">

        {/* Cover image / gradient background */}
        <div className="relative h-52 overflow-hidden">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={displayName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-brand opacity-70" />
          )}

          {/* Gradient overlay снизу для читаемости */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

          {/* Featured бейдж — верхний левый угол */}
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 rounded-pill bg-gold-400/95 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-ink">
              <Star className="h-3 w-3 fill-ink" /> Featured
            </span>
          </div>

          {/* Availability dot — верхний правый */}
          {creator.isAvailable && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-pill bg-ink/70 backdrop-blur-sm px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-cream-200 font-medium">Available</span>
            </div>
          )}

          {/* Avatar поверх cover — нижний левый */}
          <div className="absolute bottom-3 left-3">
            {creator.avatar ? (
              <Image
                src={getMediaUrl(creator.avatar.url)}
                alt={displayName}
                width={48}
                height={48}
                className="rounded-full border-2 border-cream object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-cream bg-gradient-brand text-cream font-bold text-lg">
                {displayName[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Info block */}
        <div className="p-4 pt-3">
          {/* Имя + верификация */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-display font-semibold text-cream truncate text-lg">{displayName}</h3>
              {creator.isVerified && (
                <BadgeCheck className="h-4 w-4 text-gold-300 flex-shrink-0" />
              )}
            </div>
            {price && priceLabel && (
              <div className="flex-shrink-0 text-right">
                <span className="text-gold-300 font-bold text-sm">{formatPrice(price, creator.currency)}</span>
                <span className="text-ink-300 text-xs">{priceLabel}</span>
              </div>
            )}
          </div>

          {/* Город */}
          {creator.city && (
            <div className="flex items-center gap-1 text-ink-300 text-xs mb-3">
              <MapPin className="h-3 w-3" />
              <span>{creator.city}</span>
            </div>
          )}

          {/* Тип + рейтинг */}
          <div className="flex items-center justify-between mb-4">
            <TypeBadge userType={creator.userType} />
            {creator.rating > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />
                <span className="font-semibold text-cream">{creator.rating.toFixed(1)}</span>
                {creator.totalReviews > 0 && (
                  <span className="text-ink-300 text-xs">({creator.totalReviews})</span>
                )}
              </div>
            )}
          </div>

          {/* Специализации — первые 3 */}
          {creator.specializations && creator.specializations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {creator.specializations.slice(0, 3).map((s) => (
                <span key={s} className="rounded-pill bg-ink-700 px-2 py-0.5 text-xs text-cream-200">
                  {s}
                </span>
              ))}
              {creator.specializations.length > 3 && (
                <span className="rounded-pill bg-ink-700 px-2 py-0.5 text-xs text-ink-300">
                  +{creator.specializations.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-2">
            <button
              onClick={() => setBookingOpen(true)}
              className="flex-1 rounded-pill bg-gold-500 py-2.5 text-sm font-semibold text-cream hover:bg-gold-600 transition-colors"
            >
              Book Now
            </button>
            <Link
              href={`/photographers/${creator.slug || creator.id}`}
              className="flex-1 rounded-pill border border-ink-700 py-2.5 text-sm font-semibold text-cream-200 hover:border-gold-400 hover:text-cream transition-colors text-center"
            >
              Profile
            </Link>
          </div>
        </div>
      </div>

      {bookingOpen && (
        <BookingModal provider={creator} onClose={() => setBookingOpen(false)} />
      )}
    </>
  );
}
