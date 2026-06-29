'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { Button, Chip } from '@/components/ui';
import { SPECIALIZATIONS } from '@/lib/utils';

const UAE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'];

const BUDGET_MIN = 0;
const BUDGET_MAX = 10000;
const BUDGET_STEP = 100;

function formatAed(n: number) {
  return `AED ${n.toLocaleString('en-US')}`;
}

export function PhotographersFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get('city') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState(Number(searchParams.get('minPrice')) || BUDGET_MIN);
  const [maxPrice, setMaxPrice] = useState(Number(searchParams.get('maxPrice')) || BUDGET_MAX);
  const [rating, setRating] = useState(Number(searchParams.get('rating')) || 0);

  const filledPct = useMemo(() => {
    const left = ((minPrice - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;
    const right = ((maxPrice - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;
    return { left, right };
  }, [minPrice, maxPrice]);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    const sort = searchParams.get('sort');
    if (sort) params.set('sort', sort);
    if (city) params.set('city', city);
    if (category) params.set('category', category);
    if (minPrice > BUDGET_MIN) params.set('minPrice', String(minPrice));
    if (maxPrice < BUDGET_MAX) params.set('maxPrice', String(maxPrice));
    if (rating > 0) params.set('rating', String(rating));
    router.push(`?${params.toString()}`);
  }, [router, searchParams, city, category, minPrice, maxPrice, rating]);

  const reset = useCallback(() => {
    setCity('');
    setCategory('');
    setMinPrice(BUDGET_MIN);
    setMaxPrice(BUDGET_MAX);
    setRating(0);
    const params = new URLSearchParams();
    const sort = searchParams.get('sort');
    if (sort) params.set('sort', sort);
    router.push(`?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="card p-6 space-y-7 lg:sticky lg:top-24">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold text-ink">Filters</h2>
        <button
          type="button"
          onClick={reset}
          className="text-xs font-semibold text-gold-600 hover:text-gold-500 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Category / style */}
      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-300">Style</h3>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.slice(0, 10).map((s) => {
            const active = category === s;
            return (
              <Chip
                key={s}
                role="button"
                aria-pressed={active}
                onClick={() => setCategory(active ? '' : s)}
                className={
                  active
                    ? 'cursor-pointer border-ink bg-ink text-cream hover:text-cream hover:border-ink'
                    : 'cursor-pointer'
                }
              >
                {s}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* City */}
      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-300">City</h3>
        <div className="flex flex-wrap gap-2">
          {['All UAE', ...UAE_CITIES].map((c) => {
            const value = c === 'All UAE' ? '' : c;
            const active = city === value;
            return (
              <Chip
                key={c}
                role="button"
                aria-pressed={active}
                onClick={() => setCity(value)}
                className={
                  active
                    ? 'cursor-pointer border-gold-300 bg-cream-300 text-gold-600 hover:text-gold-600'
                    : 'cursor-pointer'
                }
              >
                {c}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* Budget / day */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-300">Budget / day</h3>
          <span className="text-sm font-bold text-ink">
            {formatAed(minPrice)} – {formatAed(maxPrice)}
          </span>
        </div>

        {/* Dual range slider */}
        <div className="relative h-5">
          <div className="absolute top-1/2 left-0 right-0 h-[5px] -translate-y-1/2 rounded-pill bg-cream-500" />
          <div
            className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-pill bg-gold-500"
            style={{ left: `${filledPct.left}%`, right: `${100 - filledPct.right}%` }}
          />
          <input
            type="range"
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={BUDGET_STEP}
            value={minPrice}
            onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - BUDGET_STEP))}
            aria-label="Minimum budget per day"
            className="range-thumb pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent"
          />
          <input
            type="range"
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={BUDGET_STEP}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + BUDGET_STEP))}
            aria-label="Maximum budget per day"
            className="range-thumb pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent"
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-medium text-ink-300">
          <span>{formatAed(BUDGET_MIN)}</span>
          <span>{formatAed(BUDGET_MAX)}+</span>
        </div>
      </div>

      {/* Rating */}
      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-300">Rating</h3>
        <div className="flex flex-wrap gap-2">
          {[4.5, 4, 3.5, 0].map((r) => {
            const active = rating === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRating(r)}
                aria-pressed={active}
                className={[
                  'inline-flex items-center gap-1 rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors',
                  active
                    ? 'border-gold-300 bg-cream-300 text-gold-600'
                    : 'border-sand-300 bg-cream-50 text-ink-500 hover:border-gold-300',
                ].join(' ')}
              >
                {r === 0 ? (
                  'Any'
                ) : (
                  <>
                    <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
                    {r}+
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Button onClick={apply} variant="primary" className="w-full justify-center">
        Show results
      </Button>

      {/* Gold round slider thumbs (scoped, no foundation files touched) */}
      <style jsx>{`
        .range-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          -webkit-appearance: none;
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #b68a3e;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
          cursor: pointer;
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #b68a3e;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
          cursor: pointer;
        }
        .range-thumb::-webkit-slider-runnable-track {
          background: transparent;
        }
        .range-thumb::-moz-range-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
