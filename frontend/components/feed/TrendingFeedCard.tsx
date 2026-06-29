'use client';

/**
 * TrendingFeedCard — крупная карточка для блока «Trending in Dubai».
 * Повторяет мобильный макет: большое фото 16:11, пилюля категории слева сверху,
 * кнопка-закладка справа, ряд автора снизу (аватар, имя + verified, роль · город,
 * рейтинг). Лайк/закладка — оптимистичное обновление, как в FeedMasonryCard.
 */

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Bookmark, Heart, MapPin, MessageCircle, BadgeCheck } from 'lucide-react';
import { getMediaUrl, likeFeedPost } from '@/lib/strapi';
import { timeAgo } from '@/lib/utils';
import type { FeedPost } from '@/lib/types';

interface Props {
  post: FeedPost;
  priority?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  work: 'Work',
  behind_scenes: 'Behind the scenes',
  tip: 'Tip',
  announcement: 'Announcement',
  travel: 'Travel',
};

export function TrendingFeedCard({ post, priority = false }: Props) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [saved, setSaved] = useState(false);

  const cover = post.media?.[0];
  const authorName = post.author.displayName || post.author.username;
  const authorSlug = post.author.slug || post.author.id;
  const role = post.author.specializations?.[0];
  const city = post.location || post.author.city;
  const categoryLabel = CATEGORY_LABELS[post.category] || post.category;

  async function handleLike() {
    if (liking) return;
    setLiking(true);
    const prevLikes = likes;
    const prevLiked = liked;
    setLikes(liked ? likes - 1 : likes + 1);
    setLiked(!liked);
    try {
      await likeFeedPost(post.id);
    } catch {
      setLikes(prevLikes);
      setLiked(prevLiked);
    } finally {
      setLiking(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-sand-300 bg-cream-50 transition-shadow duration-200 hover:shadow-card">
      {/* Cover */}
      {cover && (
        <Link href={`/feed/${post.id}`} className="group relative block aspect-[16/11] overflow-hidden">
          <Image
            src={getMediaUrl(cover.url)}
            alt={post.caption || authorName}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {post.category && (
            <span className="absolute left-3 top-3 rounded-pill bg-cream-50/90 px-3 py-1.5 text-xs font-bold text-gold-700 backdrop-blur-sm">
              {categoryLabel}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setSaved((s) => !s);
            }}
            aria-label={saved ? 'Remove bookmark' : 'Save post'}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/90 text-gold-600 backdrop-blur-sm transition-colors hover:bg-cream-50"
          >
            <Bookmark className={`h-[18px] w-[18px] ${saved ? 'fill-gold-500 text-gold-500' : ''}`} />
          </button>
        </Link>
      )}

      <div className="p-4">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <Link href={`/photographers/${authorSlug}`} className="flex-none">
            {post.author.avatar ? (
              <Image
                src={getMediaUrl(post.author.avatar.url)}
                alt={authorName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-cream-50"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-cream-50">
                {authorName[0]?.toUpperCase()}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/photographers/${authorSlug}`}
              className="flex items-center gap-1.5 font-semibold text-ink hover:text-gold-600"
            >
              <span className="truncate">{authorName}</span>
              {post.author.isVerified && (
                <BadgeCheck className="h-4 w-4 flex-none fill-gold-500 text-cream-50" />
              )}
            </Link>
            {(role || city) && (
              <p className="truncate text-xs font-medium text-ink-400">
                {[role, city].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          {post.author.rating > 0 && (
            <div className="flex-none text-right">
              <div className="text-sm font-bold text-ink">
                <span className="text-gold-500">★</span> {post.author.rating.toFixed(1)}
              </div>
              {post.author.totalReviews > 0 && (
                <div className="text-[11px] font-semibold text-ink-300">
                  {post.author.totalReviews}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Caption */}
        {post.caption?.trim() && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-500">{post.caption}</p>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center gap-4 border-t border-sand-300 pt-3 text-sm text-ink-400">
          <button
            type="button"
            onClick={handleLike}
            disabled={liking}
            className="flex items-center gap-1.5 transition-colors hover:text-red-500"
          >
            <Heart className={`h-[18px] w-[18px] ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className={liked ? 'font-semibold text-red-500' : ''}>{likes}</span>
          </button>
          <Link
            href={`/feed/${post.id}`}
            className="flex items-center gap-1.5 transition-colors hover:text-gold-600"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <span>{post.commentsCount}</span>
          </Link>
          {post.location && (
            <span className="ml-auto flex items-center gap-1 text-xs text-ink-300">
              <MapPin className="h-3.5 w-3.5" />
              {post.location}
            </span>
          )}
          {!post.location && (
            <span className="ml-auto text-xs text-ink-300">{timeAgo(post.createdAt)}</span>
          )}
        </div>
      </div>
    </article>
  );
}
