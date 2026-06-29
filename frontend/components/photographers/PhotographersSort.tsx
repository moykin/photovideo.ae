'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { ChevronsUpDown } from 'lucide-react';

const OPTIONS = [
  { value: '', label: 'Recommended' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

export function PhotographersSort() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('sort') || '';

  const onChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set('sort', value);
      else params.delete('sort');
      params.delete('page');
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <label className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600">
      <span className="text-ink-300">Sort</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-pill border border-sand-300 bg-cream-50 py-1.5 pl-3 pr-8 font-semibold text-ink focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-300/40"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-3 h-4 w-4 text-ink-300" />
    </label>
  );
}
