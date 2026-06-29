'use client';

/**
 * FeedFilterTabs — горизонтальный ряд фильтр-пилюль для ленты.
 * Активная категория — тёмная (ink), остальные — белые с песочной обводкой.
 * Навигация через next/link, активное состояние читается из usePathname/searchParams.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Category {
  value: string;
  label: string;
}

interface Props {
  categories: Category[];
}

export function FeedFilterTabs({ categories }: Props) {
  const searchParams = useSearchParams();
  const active = searchParams.get('category') || 'all';

  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => {
          const isActive = active === cat.value;
          const href = cat.value === 'all' ? '/feed' : `/feed?category=${cat.value}`;
          return (
            <Link
              key={cat.value}
              href={href}
              className={cn(
                'flex-none rounded-pill px-4 py-2 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-ink text-cream-50 shadow-soft'
                  : 'border border-sand-300 bg-cream-50 text-ink-500 hover:border-gold-300 hover:text-gold-600',
              )}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
