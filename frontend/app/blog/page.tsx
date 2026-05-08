import type { Metadata } from 'next';
import { getArticles } from '@/lib/strapi';
import { ArticleCard } from '@/components/articles/ArticleCard';

export const revalidate = 120;
export const metadata: Metadata = {
  title: 'Blog — Photography & Videography Tips, News, Interviews',
  description: 'Expert tips, industry news, and inspiring stories from UAE photographers and videographers.',
};

interface SearchParams { page?: string; category?: string; }

export default async function BlogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters: Record<string, unknown> = {
    'pagination[page]': params.page || 1,
    'pagination[pageSize]': 9,
  };
  if (params.category) filters['filters[category]'] = params.category;

  const { data: articles, meta } = await getArticles(filters).catch(() => ({
    data: [],
    meta: { pagination: { page: 1, pageSize: 9, pageCount: 0, total: 0 } },
  }));

  const categories = ['news', 'tips', 'featured', 'interview', 'guide', 'inspiration'];

  return (
    <div className="py-10 px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="section-heading mb-1">Blog</h1>
          <p className="text-gray-500 dark:text-gray-400">Tips, stories, and news from the UAE creative community</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <a href="/blog"
            className={`badge px-4 py-2 transition-colors ${!params.category ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-brand-50 hover:text-brand-600'}`}>
            All
          </a>
          {categories.map((cat) => (
            <a key={cat} href={`/blog?category=${cat}`}
              className={`badge px-4 py-2 capitalize transition-colors ${params.category === cat ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-brand-50 hover:text-brand-600'}`}>
              {cat}
            </a>
          ))}
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No articles yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        )}
      </div>
    </div>
  );
}
