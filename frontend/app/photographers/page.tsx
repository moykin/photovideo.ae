import type { Metadata } from 'next';
import { getPhotographers } from '@/lib/strapi';
import { PhotographerCard } from '@/components/photographers/PhotographerCard';
import { PhotographersFilter } from '@/components/photographers/PhotographersFilter';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Photographers in UAE — Book Professional Photographers',
  description: 'Browse verified photographers in Dubai, Abu Dhabi and all UAE. Filter by specialty, price, and availability. Book instantly.',
};

interface SearchParams {
  city?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
}

export default async function PhotographersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters: Record<string, unknown> = {
    'pagination[page]': params.page || 1,
    'pagination[pageSize]': 12,
  };

  if (params.city) filters['filters[city][$containsi]'] = params.city;
  if (params.minPrice) filters['filters[pricePerHour][$gte]'] = params.minPrice;
  if (params.maxPrice) filters['filters[pricePerHour][$lte]'] = params.maxPrice;

  const { data: photographers, meta } = await getPhotographers(filters).catch(() => ({
    data: [],
    meta: { pagination: { page: 1, pageSize: 12, pageCount: 0, total: 0 } },
  }));

  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className="section-heading mb-2">Find Photographers</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {meta.pagination.total} verified photographers across the UAE
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <PhotographersFilter />
          </aside>

          {/* Grid */}
          <div className="flex-1">
            {photographers.length === 0 ? (
              <div className="text-center py-24 text-gray-400">
                No photographers found. Try adjusting your filters.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {photographers.map((p) => (
                    <PhotographerCard key={p.id} user={p} />
                  ))}
                </div>
                {/* Pagination */}
                {meta.pagination.pageCount > 1 && (
                  <div className="mt-10 flex justify-center gap-2">
                    {Array.from({ length: meta.pagination.pageCount }, (_, i) => i + 1).map((p) => (
                      <a
                        key={p}
                        href={`?page=${p}`}
                        className={`h-9 w-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          Number(params.page || 1) === p
                            ? 'bg-brand-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                        }`}
                      >
                        {p}
                      </a>
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
