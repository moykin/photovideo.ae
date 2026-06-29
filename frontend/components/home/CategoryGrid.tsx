import Link from 'next/link';
import {
  Heart,
  Camera,
  Video,
  Building2,
  Sparkles,
  PartyPopper,
  Shirt,
  Boxes,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

interface Category {
  icon: LucideIcon;
  label: string;
  count: string;
  href: string;
}

const categories: Category[] = [
  { icon: Heart, label: 'Weddings', count: '640 pros', href: '/photographers?spec=wedding' },
  { icon: Camera, label: 'Portraits', count: '520 pros', href: '/photographers?spec=portrait' },
  { icon: Building2, label: 'Real Estate', count: '180 pros', href: '/photographers?spec=real_estate' },
  { icon: Video, label: 'Videography', count: '410 pros', href: '/photographers?spec=videography' },
  { icon: PartyPopper, label: 'Events', count: '380 pros', href: '/photographers?spec=event' },
  { icon: Shirt, label: 'Fashion', count: '210 pros', href: '/photographers?spec=fashion' },
  { icon: Boxes, label: 'Product', count: '160 pros', href: '/photographers?spec=product' },
  { icon: Sparkles, label: 'Commercial', count: '240 pros', href: '/photographers?spec=commercial' },
];

export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
          Browse by category
        </h2>
        <Link
          href="/photographers"
          className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-bold text-gold-600 hover:text-gold-500"
        >
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
        {categories.map(({ icon: Icon, label, count, href }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-[18px] border border-sand-300 bg-white p-4 transition-all hover:border-gold-300 hover:shadow-card"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-cream-300">
              <Icon className="h-6 w-6 text-gold-600" />
            </div>
            <div className="mt-3 text-[15px] font-bold text-ink">{label}</div>
            <div className="mt-0.5 text-xs font-semibold text-ink-300">{count}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
