import Image from 'next/image';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { Article } from '@/lib/types';
import { getMediaUrl } from '@/lib/strapi';
import { formatDate, getInitials } from '@/lib/utils';

interface Props {
  article: Article;
}

export function ArticleCard({ article }: Props) {
  return (
    <Link href={`/blog/${article.slug}`} className="card-hover block group">
      {article.cover && (
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={getMediaUrl(article.cover.url)}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute top-3 left-3">
            <span className="badge bg-gold-500 text-cream capitalize">{article.category}</span>
          </div>
        </div>
      )}
      <div className="p-5">
        <h3 className="font-display text-xl font-semibold text-ink line-clamp-2 mb-2 group-hover:text-gold-600 transition-colors">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-sm text-ink-500 line-clamp-2 mb-4">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-ink-300">
          <div className="flex items-center gap-2">
            {article.author?.avatar ? (
              <Image
                src={getMediaUrl(article.author.avatar.url)}
                alt={article.author.displayName || article.author.username}
                width={20}
                height={20}
                className="rounded-full"
              />
            ) : (
              <div className="h-5 w-5 rounded-full bg-gradient-brand flex items-center justify-center text-cream text-[9px] font-bold">
                {getInitials(article.author?.displayName || article.author?.username)}
              </div>
            )}
            <span>{article.author?.displayName || article.author?.username}</span>
          </div>
          <div className="flex items-center gap-3">
            {article.readTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {article.readTime}m
              </span>
            )}
            <span>{formatDate(article.publishedAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
