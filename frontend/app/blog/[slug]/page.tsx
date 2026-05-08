import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Eye, Calendar } from 'lucide-react';
import { getArticle } from '@/lib/strapi';
import { getMediaUrl } from '@/lib/strapi';
import { formatDate, getInitials } from '@/lib/utils';

interface Props { params: Promise<{ slug: string }>; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug).catch(() => null);
  if (!article) return { title: 'Not Found' };
  return {
    title: article.seo?.metaTitle || article.title,
    description: article.seo?.metaDescription || article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: article.cover ? [getMediaUrl(article.cover.url)] : [],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug).catch(() => null);
  if (!article) notFound();

  return (
    <article className="py-10 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        {/* Category */}
        <span className="badge bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-300 capitalize mb-4">
          {article.category}
        </span>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-8">
          {article.author && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold">
                {getInitials(article.author.displayName || article.author.username)}
              </div>
              <span className="text-gray-600 dark:text-gray-300">
                {article.author.displayName || article.author.username}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(article.publishedAt)}
          </div>
          {article.readTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {article.readTime} min read
            </div>
          )}
          <div className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {article.views}
          </div>
        </div>

        {/* Cover image */}
        {article.cover && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10">
            <Image
              src={getMediaUrl(article.cover.url)}
              alt={article.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose dark:prose-invert prose-lg max-w-none prose-headings:font-display prose-a:text-brand-500 prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap gap-2">
              {(article.tags as string[]).map((tag) => (
                <span key={tag} className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
