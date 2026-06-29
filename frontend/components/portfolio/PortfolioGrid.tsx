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
          className="block group overflow-hidden rounded-2xl relative bg-cream-300 shadow-soft"
        >
          <div className="relative w-full" style={{ paddingBottom: '75%' }}>
            <Image
              src={getMediaUrl(item.coverImage?.url)}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/50 transition-colors duration-300" />
            <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="font-display text-cream font-semibold text-base leading-tight">{item.title}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1 text-cream/80 text-xs">
                  <Eye className="h-3 w-3" /> {item.views}
                </div>
                <span className="badge bg-gold-500/90 text-cream backdrop-blur-sm text-xs capitalize">
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
