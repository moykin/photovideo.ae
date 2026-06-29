import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getPhotographers, getPortfolios, getFeedPosts, getArticles, getFeaturedCreators } from '@/lib/strapi';
import { PhotographerCard } from '@/components/photographers/PhotographerCard';
import { FeaturedCreatorCard } from '@/components/photographers/FeaturedCreatorCard';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { FeedMasonryCard } from '@/components/feed/FeedMasonryCard';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { Hero } from '@/components/home/Hero';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { CreatorCTA } from '@/components/home/CreatorCTA';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'PhotoVideo.ae — Book Photographers & Videographers in UAE',
};

async function getData() {
  const [photographers, featuredCreators, portfolios, feedPosts, articles] = await Promise.all([
    getPhotographers({ 'pagination[pageSize]': 8 }).catch(() => ({ data: [] })),
    getFeaturedCreators(4).catch(() => [] as import('@/lib/types').User[]),
    getPortfolios({ 'filters[isFeatured]': true, 'pagination[pageSize]': 8 }).catch(() => ({ data: [] })),
    getFeedPosts({ 'pagination[pageSize]': 9 }).catch(() => ({ data: [] })),
    getArticles({ 'pagination[pageSize]': 3 }).catch(() => ({ data: [] })),
  ]);
  return { photographers, featuredCreators, portfolios, feedPosts, articles };
}

export default async function HomePage() {
  const { photographers, featuredCreators, portfolios, feedPosts, articles } = await getData();

  return (
    <>
      {/* Hero with search, stats, photo collage */}
      <Hero />

      {/* Browse by category */}
      <CategoryGrid />

      {/* Featured pros in Dubai */}
      {(featuredCreators.length > 0 || photographers.data.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:py-7">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
              Featured pros in Dubai
            </h2>
            <Link
              href="/photographers"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-bold text-gold-600 hover:text-gold-500"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featuredCreators.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCreators.map((creator) => (
                <FeaturedCreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
          )}

          {photographers.data.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {photographers.data.map((p) => (
                <PhotographerCard key={p.id} user={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trending work this week */}
      {(portfolios.data.length > 0 || feedPosts.data.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
          <h2 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
            Trending work this week
          </h2>
          <div className="mt-5">
            {portfolios.data.length > 0 ? (
              <PortfolioGrid portfolios={portfolios.data} />
            ) : (
              <div className="columns-2 gap-4 md:columns-3 xl:columns-4 [column-gap:1rem]">
                {feedPosts.data.map((post) => (
                  <FeedMasonryCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Dark creator CTA — Turn your work into bookings. */}
      <CreatorCTA />

      {/* Latest articles */}
      {articles.data.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
              From the journal
            </h2>
            <Link
              href="/blog"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-bold text-gold-600 hover:text-gold-500"
            >
              All articles <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
            {articles.data.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
