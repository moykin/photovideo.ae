'use client';

import { useEffect, useState } from 'react';
import { Calendar, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { strapi, updateBookingStatus } from '@/lib/strapi';
import { bookingStatusLabel, formatDate, formatPrice } from '@/lib/utils';
import type { Booking, User } from '@/lib/types';

export default function BookingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (!u) return;

    const isProvider = ['photographer', 'videographer', 'both'].includes(u.userType);
    const filterField = isProvider ? 'provider' : 'client';

    strapi.get('/bookings', {
      params: {
        [`filters[${filterField}][id]`]: u.id,
        populate: 'client.avatar,provider.avatar,review',
        sort: 'eventDate:desc',
        'pagination[pageSize]': 50,
      },
    })
    .then((res) => setBookings(res.data.data || []))
    .finally(() => setLoading(false));
  }, []);

  const isProvider = user && ['photographer', 'videographer', 'both'].includes(user.userType);

  const filtered = tab === 'all' ? bookings : bookings.filter((b) => b.status === tab);

  const handleAction = async (id: number, status: string) => {
    await updateBookingStatus(id, status);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: status as Booking['status'] } : b));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {(['all', 'pending', 'confirmed', 'completed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => {
            const { label, color } = bookingStatusLabel(booking.status);
            const other = isProvider ? booking.client : booking.provider;

            return (
              <div key={booking.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {booking.eventType}
                          </p>
                          <span className={`badge ${color}`}>{label}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{booking.referenceCode}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">{isProvider ? 'Client' : 'Photographer'}</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          {other?.displayName || other?.username}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Date</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          {formatDate(booking.eventDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Location</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">{booking.city}</p>
                      </div>
                      {booking.agreedPrice && (
                        <div>
                          <p className="text-xs text-gray-400">Price</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">
                            {formatPrice(booking.agreedPrice, booking.currency)}
                          </p>
                        </div>
                      )}
                    </div>

                    {booking.clientNotes && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        &ldquo;{booking.clientNotes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {isProvider && booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(booking.id, 'confirmed')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" /> Accept
                        </button>
                        <button
                          onClick={() => handleAction(booking.id, 'rejected')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="h-4 w-4" /> Decline
                        </button>
                      </>
                    )}
                    {isProvider && booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleAction(booking.id, 'completed')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 text-sm font-medium hover:bg-brand-100 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" /> Mark Complete
                      </button>
                    )}
                    {!isProvider && booking.status === 'pending' && (
                      <button
                        onClick={() => handleAction(booking.id, 'cancelled')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        <XCircle className="h-4 w-4" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
