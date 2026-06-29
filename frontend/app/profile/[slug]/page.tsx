import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Review } from '@/lib/types';
import { getUserBySlug, getPortfolios, getProviderReviews } from '@/lib/strapi';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfilePackages } from '@/components/profile/ProfilePackages';
import { ProfileAbout } from '@/components/profile/ProfileAbout';
import { ProfileReviews } from '@/components/profile/ProfileReviews';
import { BookingCard } from '@/components/profile/BookingCard';

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
    getPortfolios({ 'filters[author][id]': user.id, 'pagination[pageSize]': 12 }).catch(() => ({
      data: [],
    })),
    getProviderReviews(user.id).catch(() => ({ data: [] })),
  ]);

  const portfolios = portfoliosRes.data;
  const reviews = reviewsRes.data as Review[];

  return (
    <div className="bg-cream pb-20">
      <ProfileHero user={user} />

      <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          {/* Main column */}
          <div className="space-y-12">
            {portfolios.length > 0 && (
              <section id="work">
                <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Selected work</h2>
                <PortfolioGrid portfolios={portfolios} />
              </section>
            )}

            <ProfilePackages user={user} />
            <ProfileReviews user={user} reviews={reviews} />
            <ProfileAbout user={user} />
          </div>

          {/* Sticky booking card */}
          <aside className="lg:row-start-1 lg:col-start-2">
            <div className="lg:sticky lg:top-24">
              <BookingCard provider={user} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
