'use client';

import { useState } from 'react';
import { Calendar, MessageCircle, Lock, Star, ShieldCheck, Clock } from 'lucide-react';
import type { User } from '@/lib/types';
import { BookingModal } from '@/components/booking/BookingModal';
import { getStoredUser } from '@/lib/auth';
import { formatPrice, formatRating } from '@/lib/utils';

interface Props {
  provider: User;
}

export function BookingCard({ provider }: Props) {
  const [open, setOpen] = useState(false);

  const startingPrice = provider.pricePerEvent ?? provider.pricePerHour;
  const isClient = provider.userType === 'client';
  const available = provider.isAvailable && !isClient;

  const handleBook = () => {
    const me = getStoredUser();
    if (!me) {
      window.location.href =
        '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (me.id === provider.id) return;
    setOpen(true);
  };

  const handleMessage = () => {
    const me = getStoredUser();
    if (!me) {
      window.location.href =
        '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    window.location.href = '/messages?to=' + (provider.slug || provider.id);
  };

  return (
    <div className="rounded-3xl border border-sand-300 bg-cream-50 p-5 shadow-card">
      {/* Price + rating */}
      <div className="flex items-end justify-between">
        <div>
          {startingPrice ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">
                Starting from
              </p>
              <p className="font-display text-3xl font-semibold text-ink">
                {formatPrice(startingPrice, provider.currency)}
                {!provider.pricePerEvent && provider.pricePerHour && (
                  <span className="text-base font-sans font-medium text-ink-300"> / hr</span>
                )}
              </p>
            </>
          ) : (
            <p className="font-display text-2xl font-semibold text-ink">Custom quote</p>
          )}
        </div>
        <span className="flex items-center gap-1 rounded-pill border border-sand-300 bg-cream px-3 py-1.5 text-sm font-bold text-ink">
          <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
          {formatRating(provider.rating)}
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
        <Clock className="h-3.5 w-3.5 text-gold-500" />
        Responds in ~1h
      </p>

      {/* Actions */}
      <div className="mt-5 space-y-2.5">
        {available ? (
          <button
            onClick={handleBook}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 px-6 py-3.5 text-sm font-bold text-cream shadow-gold transition-colors hover:bg-gold-600 active:scale-[0.99]"
          >
            <Calendar className="h-4 w-4" />
            Request to book
          </button>
        ) : (
          <button
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-cream-400 px-6 py-3.5 text-sm font-bold text-ink-300"
          >
            <Calendar className="h-4 w-4" />
            Not available
          </button>
        )}

        <button
          onClick={handleMessage}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sand-400 bg-cream-50 px-6 py-3.5 text-sm font-bold text-ink transition-colors hover:border-gold-400 hover:text-gold-600 active:scale-[0.99]"
        >
          <MessageCircle className="h-4 w-4" />
          Message
        </button>
      </div>

      {/* Escrow note */}
      <div className="mt-5 space-y-2.5 border-t border-sand-300 pt-5">
        <p className="flex items-center gap-2 text-xs font-semibold text-ink-600">
          <Lock className="h-3.5 w-3.5 shrink-0 text-gold-600" />
          {formatPrice(2000, provider.currency)} deposit held in escrow
        </p>
        <p className="flex items-center gap-2 text-xs text-ink-300">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gold-500" />
          Released to the pro after your shoot is complete.
        </p>
      </div>

      {open && <BookingModal provider={provider} onClose={() => setOpen(false)} />}
    </div>
  );
}
