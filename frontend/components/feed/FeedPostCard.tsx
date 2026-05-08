'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { FeedPost } from '@/lib/types';
import { getMediaUrl, likeFeedPost } from '@/lib/strapi';
import { getInitials, timeAgo } from '@/lib/utils';

interface Props {
  post: FeedPost;
}

export function FeedPostCard({ post }: Props) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await likeFeedPost(post.id);
      setLikes((prev) => (liked ? prev - 1 : prev + 1));
      setLiked((prev) => !prev);
    } catch {
      // requires auth — silently fail
    }
  };

  const firstMedia = post.media?.[0];

  return (
    <article className="card-hover overflow-hidden">
      {/* Media */}
      {firstMedia && (
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
          <Image
            src={getMediaUrl(firstMedia.url)}
            alt={post.caption || 'Feed post'}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {post.media.length > 1 && (
            <div className="absolute top-2 right-2 badge bg-black/50 text-white backdrop-blur-sm">
              +{post.media.length - 1}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/profile/${post.author?.slug || post.author?.username}`}>
            <div className="relative h-9 w-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-brand">
              {post.author?.avatar ? (
                <Image
                  src={getMediaUrl(post.author.avatar.url)}
                  alt={post.author.displayName || post.author.username}
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              ) : (
                <span className="h-full w-full flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(post.author?.displayName || post.author?.username)}
                </span>
              )}
            </div>
          </Link>
          <div className="min-w-0">
            <Link href={`/profile/${post.author?.slug || post.author?.username}`}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-brand-500 transition-colors">
              {post.author?.displayName || post.author?.username}
            </Link>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {post.location && (
                <>
                  <MapPin className="h-3 w-3" />
                  <span>{post.location}</span>
                  <span>·</span>
                </>
              )}
              <span>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
            {post.caption}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {(post.tags as string[]).slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs text-brand-500 hover:text-brand-600 cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{likes}</span>
          </button>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <MessageCircle className="h-4 w-4" />
            <span>{post.commentsCount}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
