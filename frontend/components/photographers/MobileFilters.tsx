'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { PhotographersFilter } from './PhotographersFilter';

export function MobileFilters() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-pill border border-sand-300 bg-cream-50 px-4 py-2 text-sm font-semibold text-ink"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto bg-cream p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-xl font-semibold text-ink">Filters</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="rounded-pill p-1.5 text-ink-500 hover:bg-cream-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <PhotographersFilter />
          </div>
        </div>
      )}
    </div>
  );
}
