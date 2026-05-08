'use client';

/**
 * FeedMasonryCard — адаптивная карточка ленты для masonry-грида
 *
 * v1.0 — initial: три режима в одном компоненте:
 *   - только фото (нет caption) → компактная квадратная карточка
 *   - фото + текст → фото сверху, текст снизу
 *   - только текст (нет media) → текстовая карточка с аватаром
 *   Лайки + имя автора присутствуют всегда.
 */

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Heart, MapPin, MessageCircle } from 'lucide-react';
import { getMediaUrl } from '@/lib/strapi';
import { timeAgo, truncate } from '@/lib/utils';
import { likeFeedPost } from '@/lib/strapi';
import type { FeedPost } from '@/lib/types';

interface Props {
  post: FeedPost;
}

export function FeedMasonryCard({ post }: Props) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  const hasMedia = post.media && post.media.length > 0;
  const hasCaption = !!post.caption?.trim();
  const authorName = post.author.displayName || post.author.username;
  const authorSlug = post.author.slug || post.author.id;

  // Лайк — оптимистичное обновление
  async function handleLike() {
    if (liking) return;
    setLiking(true);
    const next = liked ? likes - 1 : likes + 1;
    setLikes(next);
    setLiked(!liked);
    try {
      await likeFeedPost(post.id);
    } catch {
      // откатываем если ошибка
      setLikes(likes);
      setLiked(liked);
    } finally {
      setLiking(false);
    }
  }

  return (
    <div className="break-inside-avoid mb-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow duration-200">

      {/* Фото (если есть) */}
      {hasMedia && (
        <Link href={`/feed/${post.id}`} className="block relative overflow-hidden">
          <Image
            src={getMediaUrl(post.media[0].url)}
            alt={post.caption || 'Feed post'}
            width={post.media[0].width || 600}
            height={post.media[0].height || 400}
            className="w-full object-cover hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Счётчик если несколько фото */}
          {post.media.length > 1 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-white text-xs">
              +{post.media.length - 1}
            </div>
          )}
        </Link>
      )}

      {/* Контент */}
      <div className="p-3">
        {/* Автор */}
        <Link
          href={`/photographers/${authorSlug}`}
          className="flex items-center gap-2 mb-2 group"
        >
          {post.author.avatar ? (
            <Image
              src={getMediaUrl(post.author.avatar.url)}
              alt={authorName}
              width={28}
              height={28}
              className="rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-500 text-xs font-bold">
              {authorName[0].toUpperCase()}
            </div>
          )}
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-brand-500 transition-colors truncate">
            {authorName}
          </span>
          <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
            {timeAgo(post.createdAt)}
          </span>
        </Link>

        {/* Текст (если есть) */}
        {hasCaption && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
            {hasMedia
              ? truncate(post.caption!, 120)   // под фото — короче
              : truncate(post.caption!, 280)}  {/* только текст — длиннее */}
          </p>
        )}

        {/* Локация */}
        {post.location && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
            <MapPin className="h-3 w-3" />
            <span>{post.location}</span>
          </div>
        )}

        {/* Теги */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {post.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs text-brand-500 hover:text-brand-600 cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: лайки + комментарии */}
        <div className="flex items-center gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleLike}
            disabled={liking}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${liked ? 'fill-red-500 text-red-500' : ''}`}
            />
            <span className={liked ? 'text-red-500 font-medium' : ''}>{likes}</span>
          </button>

          {post.commentsCount > 0 && (
            <Link
              href={`/feed/${post.id}`}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-500 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.commentsCount}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
