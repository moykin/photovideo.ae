'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { SPECIALIZATIONS } from '@/lib/utils';

const UAE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'];

export function PhotographersFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  const apply = () => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    router.push(`?${params.toString()}`);
  };

  const reset = () => {
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    router.push('?');
  };

  return (
    <div className="card p-5 space-y-6 sticky top-20">
      <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="input"
        >
          <option value="">All UAE</option>
          {UAE_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Price / Hour (AED)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="input"
            min="0"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="input"
            min="0"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={apply} className="btn-primary w-full">
          <Search className="h-4 w-4" /> Apply Filters
        </button>
        <button onClick={reset} className="btn-secondary w-full">
          Reset
        </button>
      </div>
    </div>
  );
}
