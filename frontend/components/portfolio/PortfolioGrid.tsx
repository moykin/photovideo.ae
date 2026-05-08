import Image from 'next/image';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { Portfolio } from '@/lib/types';
import { getMediaUrl } from '@/lib/strapi';

interface Props {
  portfolios: Portfolio[];
}

export function PortfolioGrid({ portfolios }: Props) {
  return (
    <div className="masonry">
      {portfolios.map((item) => (
        <Link
          key={item.id}
          href={`/portfolio/${item.id}`}
          className="block group overflow-hidden rounded-2xl relative bg-gray-100 dark:bg-gray-800"
        >
          <div className="relative w-full" style={{ paddingBottom: '75%' }}>
            <Image
              src={getMediaUrl(item.coverImage?.url)}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
            <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-white font-semibold text-sm leading-tight">{item.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-white/80 text-xs">
                  <Eye className="h-3 w-3" /> {item.views}
                </div>
                <span className="badge bg-white/20 text-white backdrop-blur-sm text-xs">
                  {item.category}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
