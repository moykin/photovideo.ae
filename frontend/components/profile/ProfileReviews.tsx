import Image from 'next/image';
import { Star } from 'lucide-react';
import type { User, Review } from '@/lib/types';
import { getMediaUrl } from '@/lib/strapi';
import { getInitials, formatDate, formatRating } from '@/lib/utils';

interface Props {
  user: User;
  reviews: Review[];
}

const BREAKDOWN: { label: string; factor: number }[] = [
  { label: 'Quality', factor: 1.0 },
  { label: 'Communication', factor: 0.99 },
  { label: 'Punctuality', factor: 0.97 },
  { label: 'Value', factor: 0.95 },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.round(rating) ? 'fill-gold-500 text-gold-500' : 'fill-sand-300 text-sand-300'
          }`}
        />
      ))}
    </span>
  );
}

export function ProfileReviews({ user, reviews }: Props) {
  const rating = user.rating || 0;
  const count = user.totalReviews ?? reviews.length;

  return (
    <section id="reviews">
      <h2 className="font-display text-2xl font-semibold text-ink">Reputation</h2>

      <div className="mt-4 rounded-2xl border border-sand-300 bg-cream-50 p-5 shadow-soft sm:flex sm:items-center sm:gap-8">
        {/* Score */}
        <div className="text-center sm:w-32 sm:shrink-0">
          <div className="font-display text-5xl font-semibold leading-none text-ink">
            {formatRating(rating)}
          </div>
          <div className="mt-1.5 flex justify-center">
            <Stars rating={rating} />
          </div>
          <p className="mt-1 text-xs font-semibold text-ink-300">{count} reviews</p>
        </div>

        {/* Breakdown */}
        <div className="mt-6 flex-1 space-y-3 sm:mt-0">
          {BREAKDOWN.map(({ label, factor }) => {
            const score = Math.min(5, rating * factor || 0);
            const pct = (score / 5) * 100;
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="w-24 text-xs font-semibold text-ink-500">{label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-cream-400">
                  <span
                    className="block h-full rounded-pill bg-gold-500"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-8 text-right text-xs font-bold text-ink">
                  {formatRating(score)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="mt-5 space-y-3">
          {reviews.map((review) => {
            const author = review.author;
            const authorName = author?.displayName || author?.username || 'Client';
            return (
              <article
                key={review.id}
                className="rounded-2xl border border-sand-300 bg-cream-50 p-4 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-brand">
                    {author?.avatar ? (
                      <Image
                        src={getMediaUrl(author.avatar.url)}
                        alt={authorName}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-cream">
                        {getInitials(authorName)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">{authorName}</p>
                    <p className="text-[11px] font-semibold text-ink-300">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <Stars rating={review.rating} />
                </div>

                {review.comment && (
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{review.comment}</p>
                )}

                {!!review.photos?.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.photos.map((photo) => (
                      <span
                        key={photo.id}
                        className="relative inline-block h-16 w-16 overflow-hidden rounded-xl bg-cream-300"
                      >
                        <Image
                          src={getMediaUrl(photo.url)}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-sand-300 bg-cream-100 px-4 py-8 text-center text-sm text-ink-300">
          No reviews yet. Be the first to book and review.
        </p>
      )}
    </section>
  );
}
