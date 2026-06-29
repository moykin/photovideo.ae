import type { Metadata } from 'next';
import Link from 'next/link';
import { getPhotographers } from '@/lib/strapi';
import { PhotographerCard } from '@/components/photographers/PhotographerCard';
import { PhotographersFilter } from '@/components/photographers/PhotographersFilter';
import { PhotographersSort } from '@/components/photographers/PhotographersSort';
import { MobileFilters } from '@/components/photographers/MobileFilters';
import { SectionHeading } from '@/components/ui';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Find a Pro — Book Professional Photographers in the UAE',
  description:
    'Browse verified photographers and videographers in Dubai, Abu Dhabi and all UAE. Filter by style, city, budget and rating, then book instantly.',
};

interface SearchParams {
  city?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  sort?: string;
  page?: string;
}

const SORT_MAP: Record<string, string> = {
  rating: 'rating:desc',
  price_asc: 'pricePerHour:asc',
  price_desc: 'pricePerHour:desc',
  newest: 'createdAt:desc',
};

export default async function PhotographersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;

  const filters: Record<string, unknown> = {
    'pagination[page]': currentPage,
    'pagination[pageSize]': 12,
    sort: SORT_MAP[params.sort ?? ''] || 'rating:desc',
  };

  if (params.city) filters['filters[city][$containsi]'] = params.city;
  if (params.category) filters['filters[specializations][$containsi]'] = params.category;
  if (params.minPrice) filters['filters[pricePerHour][$gte]'] = params.minPrice;
  if (params.maxPrice) filters['filters[pricePerHour][$lte]'] = params.maxPrice;
  if (params.rating) filters['filters[rating][$gte]'] = params.rating;

  const { data: photographers, meta } = await getPhotographers(filters).catch(() => ({
    data: [],
    meta: { pagination: { page: 1, pageSize: 12, pageCount: 0, total: 0 } },
  }));

  // Build a querystring preserving filters for pagination links.
  const buildPageHref = (page: number) => {
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (k !== 'page' && v) qp.set(k, String(v));
    });
    qp.set('page', String(page));
    return `?${qp.toString()}`;
  };

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="border-b border-sand-300 bg-cream-300/60">
        <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <SectionHeading
            eyebrow="Find a pro"
            title="Hire the right photographer"
            subtitle="Verified photographers and videographers across the UAE. Filter by style, city, budget and rating — then book in a few taps."
            align="left"
          />
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden w-full flex-shrink-0 lg:block lg:w-80">
            <PhotographersFilter />
          </aside>

          {/* Results */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <MobileFilters />
                <p className="text-sm font-bold text-ink">
                  {meta.pagination.total}{' '}
                  <span className="font-medium text-ink-300">
                    {meta.pagination.total === 1 ? 'pro' : 'pros'} found
                  </span>
                </p>
              </div>
              <PhotographersSort />
            </div>

            {photographers.length === 0 ? (
              <div className="card flex flex-col items-center gap-2 py-24 text-center">
                <p className="font-display text-2xl font-semibold text-ink">No pros found</p>
                <p className="text-sm text-ink-300">
                  Try widening your budget or clearing some filters.
                </p>
                <Link href="/photographers" className="btn-secondary mt-3">
                  Reset filters
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {photographers.map((p) => (
                    <PhotographerCard key={p.id} user={p} />
                  ))}
                </div>

                {/* Pagination */}
                {meta.pagination.pageCount > 1 && (
                  <div className="mt-12 flex flex-wrap justify-center gap-2">
                    {Array.from({ length: meta.pagination.pageCount }, (_, i) => i + 1).map((p) => (
                      <Link
                        key={p}
                        href={buildPageHref(p)}
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-pill text-sm font-semibold transition-colors',
                          currentPage === p
                            ? 'bg-gold-500 text-cream'
                            : 'border border-sand-300 bg-cream-50 text-ink-500 hover:border-gold-300 hover:text-ink',
                        ].join(' ')}
                      >
                        {p}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
