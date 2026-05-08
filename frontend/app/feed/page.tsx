import type { Metadata } from 'next';
import { getFeedPosts } from '@/lib/strapi';
import { FeedPostCard } from '@/components/feed/FeedPostCard';

export const revalidate = 30;
export const metadata: Metadata = {
  title: 'Creative Feed — Photographers & Videographers UAE',
  description: 'Browse the latest work from top photographers and videographers across UAE.',
};

interface SearchParams { page?: string; category?: string; }

export default async function FeedPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters: Record<string, unknown> = {
    'pagination[page]': params.page || 1,
    'pagination[pageSize]': 18,
  };
  if (params.category) filters['filters[category]'] = params.category;

  const { data: posts, meta } = await getFeedPosts(filters).catch(() => ({
    data: [],
    meta: { pagination: { page: 1, pageSize: 18, pageCount: 0, total: 0 } },
  }));

  const categories = ['all', 'work', 'behind_scenes', 'tip', 'announcement', 'travel'];

  return (
    <div className="py-10 px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="section-heading mb-1">Creative Feed</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {meta.pagination.total} posts from UAE creators
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <a
              key={cat}
              href={cat === 'all' ? '/feed' : `/feed?category=${cat}`}
              className={`badge px-4 py-2 capitalize transition-colors ${
                (params.category || 'all') === cat
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600'
              }`}
            >
              {cat.replace('_', ' ')}
            </a>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-24 text-gray-400">No posts yet. Be the first to share!</div>
        ) : (
          <div className="masonry">
            {posts.map((post) => (
              <div key={post.id} className="break-inside-avoid mb-4">
                <FeedPostCard post={post} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.pagination.pageCount > 1 && (
          <div className="mt-12 flex justify-center gap-2">
            {Array.from({ length: meta.pagination.pageCount }, (_, i) => i + 1).map((p) => (
              <a
                key={p}
                href={`?page=${p}${params.category ? `&category=${params.category}` : ''}`}
                className={`h-9 w-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  Number(params.page || 1) === p
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-brand-50 hover:text-brand-600'
                }`}
              >
                {p}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
