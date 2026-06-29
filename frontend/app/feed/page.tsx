import type { Metadata } from 'next';
import Link from 'next/link';
import { getFeedPosts } from '@/lib/strapi';
import type { FeedPost } from '@/lib/types';
import { SectionHeading } from '@/components/ui';
import { FeedFilterTabs } from '@/components/feed/FeedFilterTabs';
import { TrendingFeedCard } from '@/components/feed/TrendingFeedCard';
import { FeedMasonryCard } from '@/components/feed/FeedMasonryCard';

export const revalidate = 30;
export const metadata: Metadata = {
  title: 'Creative Feed — Photographers & Videographers UAE',
  description: 'Browse the latest work from top photographers and videographers across UAE.',
};

interface SearchParams {
  page?: string;
  category?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'work', label: 'Work' },
  { value: 'behind_scenes', label: 'Behind the scenes' },
  { value: 'tip', label: 'Tips' },
  { value: 'announcement', label: 'News' },
  { value: 'travel', label: 'Travel' },
];

export default async function FeedPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const currentPage = Number(params.page || 1);

  const filters: Record<string, unknown> = {
    'pagination[page]': currentPage,
    'pagination[pageSize]': 18,
  };
  if (params.category) filters['filters[category]'] = params.category;

  const { data: posts, meta } = await getFeedPosts(filters).catch(() => ({
    data: [] as FeedPost[],
    meta: { pagination: { page: 1, pageSize: 18, pageCount: 0, total: 0 } },
  }));

  // На первой странице без фильтра выделяем верхние карточки с фото в блок «Trending».
  const showTrending = currentPage === 1;
  const trending = showTrending ? posts.filter((p) => p.media && p.media.length > 0).slice(0, 3) : [];
  const trendingIds = new Set(trending.map((p) => p.id));
  const rest = posts.filter((p) => !trendingIds.has(p.id));

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero header */}
      <section className="border-b border-sand-300 bg-cream-200">
        <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.18em] text-gold-500">
            Creative Feed
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Trending in Dubai
          </h1>
          <p className="mt-3 max-w-xl text-ink-500">
            The latest work, stories and tips from {meta.pagination.total} creators across the UAE.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Filter tabs */}
        <div className="mb-8">
          <FeedFilterTabs categories={CATEGORIES} />
        </div>

        {posts.length === 0 ? (
          <div className="rounded-3xl border border-sand-300 bg-cream-50 py-24 text-center">
            <p className="font-display text-2xl text-ink">No posts yet</p>
            <p className="mt-2 text-ink-400">Be the first to share your work.</p>
          </div>
        ) : (
          <>
            {/* Trending row */}
            {trending.length > 0 && (
              <section className="mb-12">
                <SectionHeading
                  eyebrow="Featured"
                  title="Trending now"
                  className="mb-6"
                  action={
                    <Link
                      href="/photographers"
                      className="text-sm font-semibold text-gold-600 hover:text-gold-700"
                    >
                      Find a pro →
                    </Link>
                  }
                />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {trending.map((post, i) => (
                    <TrendingFeedCard key={post.id} post={post} priority={i < 3} />
                  ))}
                </div>
              </section>
            )}

            {/* Masonry feed */}
            {rest.length > 0 && (
              <section>
                {trending.length > 0 && (
                  <SectionHeading title="From the community" className="mb-6" />
                )}
                <div className="masonry">
                  {rest.map((post) => (
                    <FeedMasonryCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Pagination */}
        {meta.pagination.pageCount > 1 && (
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {Array.from({ length: meta.pagination.pageCount }, (_, i) => i + 1).map((p) => {
              const isActive = currentPage === p;
              const href = `?page=${p}${params.category ? `&category=${params.category}` : ''}`;
              return (
                <Link
                  key={p}
                  href={href}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-gold-500 text-cream-50 shadow-soft'
                      : 'border border-sand-300 bg-cream-50 text-ink-500 hover:border-gold-300 hover:text-gold-600'
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
