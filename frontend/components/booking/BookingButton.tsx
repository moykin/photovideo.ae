'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import type { User } from '@/lib/types';
import { BookingModal } from './BookingModal';
import { getStoredUser } from '@/lib/auth';

interface Props {
  provider: User;
}

export function BookingButton({ provider }: Props) {
  const [open, setOpen] = useState(false);

  if (provider.userType === 'client') return null;
  if (!provider.isAvailable) {
    return (
      <button disabled className="btn-secondary opacity-50 cursor-not-allowed">
        <Calendar className="h-4 w-4" /> Not Available
      </button>
    );
  }

  const handleClick = () => {
    const me = getStoredUser();
    if (!me) {
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (me.id === provider.id) return;
    setOpen(true);
  };

  return (
    <>
      <button onClick={handleClick} className="btn-primary">
        <Calendar className="h-4 w-4" /> Book Now
      </button>
      {open && <BookingModal provider={provider} onClose={() => setOpen(false)} />}
    </>
  );
}
