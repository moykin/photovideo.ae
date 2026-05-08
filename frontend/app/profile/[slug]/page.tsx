import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, MapPin, CheckCircle, Camera, Calendar, Globe, Instagram, Facebook, Youtube } from 'lucide-react';
import { getUserBySlug, getPortfolios, getProviderReviews } from '@/lib/strapi';
import { getMediaUrl } from '@/lib/strapi';
import { formatPrice, formatRating, getInitials, formatDate } from '@/lib/utils';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { BookingButton } from '@/components/booking/BookingButton';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const user = await getUserBySlug(slug).catch(() => null);
  if (!user) return { title: 'Not Found' };
  return {
    title: `${user.displayName || user.username} — Photographer in ${user.city || 'UAE'}`,
    description: user.bio || `Book ${user.displayName || user.username} on PhotoVideo.ae`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { slug } = await params;
  const user = await getUserBySlug(slug).catch(() => null);
  if (!user) notFound();

  const [portfoliosRes, reviewsRes] = await Promise.all([
    getPortfolios({ 'filters[author][id]': user.id, 'pagination[pageSize]': 12 }).catch(() => ({ data: [] })),
    getProviderReviews(user.id).catch(() => ({ data: [] })),
  ]);

  const portfolios = portfoliosRes.data;
  const reviews = reviewsRes.data;

  return (
    <div>
      {/* Cover */}
      <div className="relative h-48 md:h-72 bg-gradient-to-br from-brand-900 to-gray-900">
        {user.coverPhoto && (
          <Image
            src={getMediaUrl(user.coverPhoto.url)}
            alt="Cover"
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Profile header */}
        <div className="relative -mt-16 mb-8 flex flex-col sm:flex-row sm:items-end gap-5">
          <div className="relative h-28 w-28 rounded-2xl ring-4 ring-white dark:ring-gray-950 overflow-hidden flex-shrink-0 bg-gradient-brand shadow-xl">
            {user.avatar ? (
              <Image src={getMediaUrl(user.avatar.url)} alt={user.displayName || user.username} fill className="object-cover" />
            ) : (
              <span className="h-full w-full flex items-center justify-center text-white font-bold text-3xl">
                {getInitials(user.displayName || user.username)}
              </span>
            )}
          </div>

          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-start gap-3 justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user.displayName || user.username}
                  </h1>
                  {user.isVerified && (
                    <CheckCircle className="h-5 w-5 text-brand-500 flex-shrink-0" />
                  )}
                </div>
                {user.location && (
                  <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
                    <MapPin className="h-4 w-4" />
                    {user.city}{user.country ? `, ${user.country}` : ''}
                  </div>
                )}
              </div>
              <BookingButton provider={user} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: about + stats */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="card p-5">
              <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
                {[
                  { value: formatRating(user.rating), label: 'Rating', icon: Star },
                  { value: user.totalReviews, label: 'Reviews', icon: null },
                  { value: user.completedBookings, label: 'Bookings', icon: null },
                ].map(({ value, label, icon: Icon }) => (
                  <div key={label} className="text-center px-3">
                    <div className="flex items-center justify-center gap-1">
                      {Icon && <Icon className="h-4 w-4 fill-gold-400 text-gold-400" />}
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{value}</span>
                    </div>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            {(user.pricePerHour || user.pricePerEvent) && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Pricing</h3>
                <div className="space-y-3">
                  {user.pricePerHour && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Per Hour</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatPrice(user.pricePerHour, user.currency)}
                      </span>
                    </div>
                  )}
                  {user.pricePerEvent && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Per Event</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatPrice(user.pricePerEvent, user.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* About */}
            {user.bio && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">About</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                  {user.bio}
                </p>
              </div>
            )}

            {/* Specializations */}
            {user.specializations?.length && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {(user.specializations as string[]).map((s) => (
                    <span key={s} className="badge bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-300 px-3 py-1">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="card p-5 space-y-3 text-sm">
              {user.experience && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Camera className="h-4 w-4 text-brand-500" />
                  {user.experience} years of experience
                </div>
              )}
              {user.languages?.length && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Globe className="h-4 w-4 text-brand-500" />
                  {(user.languages as string[]).join(', ')}
                </div>
              )}
              {user.isAvailable !== undefined && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 text-brand-500" />
                  {user.isAvailable ? 'Available for bookings' : 'Currently busy'}
                </div>
              )}
            </div>

            {/* Social links */}
            {user.socialLinks && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Social Media</h3>
                <div className="flex flex-wrap gap-2">
                  {user.socialLinks.instagram && (
                    <a href={user.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 badge bg-pink-50 dark:bg-pink-900/20 text-pink-600 px-3 py-1.5">
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                    </a>
                  )}
                  {user.socialLinks.youtube && (
                    <a href={user.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 badge bg-red-50 dark:bg-red-900/20 text-red-600 px-3 py-1.5">
                      <Youtube className="h-3.5 w-3.5" /> YouTube
                    </a>
                  )}
                  {user.socialLinks.facebook && (
                    <a href={user.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 badge bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-3 py-1.5">
                      <Facebook className="h-3.5 w-3.5" /> Facebook
                    </a>
                  )}
                  {user.socialLinks.website && (
                    <a href={user.socialLinks.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5">
                      <Globe className="h-3.5 w-3.5" /> Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: portfolio + reviews */}
          <div className="lg:col-span-2 space-y-10">
            {portfolios.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Portfolio</h2>
                <PortfolioGrid portfolios={portfolios} />
              </div>
            )}

            {reviews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">
                  Reviews ({reviews.length})
                </h2>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="card p-5">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(review.author?.displayName || review.author?.username)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {review.author?.displayName || review.author?.username}
                            </span>
                            <div className="flex">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-gold-400 text-gold-400' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{formatDate(review.createdAt)}</p>
                          {review.comment && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
