import Image from 'next/image';
import { MapPin, Zap, Star, Camera, Briefcase, Award } from 'lucide-react';
import type { User } from '@/lib/types';
import { getMediaUrl } from '@/lib/strapi';
import { getInitials, formatRating } from '@/lib/utils';

interface Props {
  user: User;
}

function roleLabel(user: User): string {
  switch (user.userType) {
    case 'photographer':
      return 'Photographer';
    case 'videographer':
      return 'Videographer';
    case 'both':
      return 'Photographer & Videographer';
    default:
      return 'Creator';
  }
}

export function ProfileHero({ user }: Props) {
  const name = user.displayName || user.username;
  const locationLabel = [user.city, user.country].filter(Boolean).join(', ');

  const stats = [
    { value: user.completedBookings ?? 0, label: 'Projects', icon: Briefcase },
    { value: user.experience ? `${user.experience} yrs` : '—', label: 'Experience', icon: Camera },
    { value: user.totalReviews ?? 0, label: 'Reviews', icon: Award },
  ];

  return (
    <section>
      {/* Cover */}
      <div className="relative h-52 md:h-80 bg-gradient-dark overflow-hidden">
        {user.coverPhoto && (
          <Image
            src={getMediaUrl(user.coverPhoto.url)}
            alt={`${name} cover`}
            fill
            priority
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-ink/15" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Identity */}
        <div className="relative -mt-14 md:-mt-16 flex flex-col sm:flex-row sm:items-end gap-5">
          <div className="relative h-28 w-28 md:h-32 md:w-32 rounded-3xl ring-4 ring-cream overflow-hidden shrink-0 bg-gradient-brand shadow-card">
            {user.avatar ? (
              <Image
                src={getMediaUrl(user.avatar.url)}
                alt={name}
                fill
                sizes="128px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-semibold text-cream">
                {getInitials(name)}
              </span>
            )}
          </div>

          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink leading-none">
                {name}
              </h1>
              {user.isVerified && (
                <Award className="h-6 w-6 fill-gold-500 text-cream shrink-0" aria-label="Verified" />
              )}
            </div>
            <p className="mt-2 text-sm font-semibold text-ink-500">{roleLabel(user)}</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-ink">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
                {formatRating(user.rating)}
                <span className="font-medium text-ink-300">({user.totalReviews ?? 0})</span>
              </span>
              {locationLabel && (
                <span className="flex items-center gap-1.5 text-ink-500">
                  <MapPin className="h-4 w-4 text-ink-300" />
                  {locationLabel}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-ink-500">
                <Zap className="h-4 w-4 text-gold-500" />
                Responds in ~1h
              </span>
            </div>

            {!!user.languages?.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(user.languages as string[]).map((lang) => (
                  <span
                    key={lang}
                    className="rounded-pill border border-sand-300 bg-cream-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-500"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-6 flex overflow-hidden rounded-2xl border border-sand-300 bg-cream-100">
          {stats.map(({ value, label, icon: Icon }, i) => (
            <div
              key={label}
              className={`flex-1 px-3 py-4 text-center ${i > 0 ? 'border-l border-sand-300' : ''}`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Icon className="h-4 w-4 text-gold-500" />
                <span className="text-lg font-extrabold text-ink">{value}</span>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-ink-300">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
