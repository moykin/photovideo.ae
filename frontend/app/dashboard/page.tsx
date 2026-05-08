'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Images, Star, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { strapi } from '@/lib/strapi';
import { bookingStatusLabel, formatDate } from '@/lib/utils';
import type { User, Booking } from '@/lib/types';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);

    if (u) {
      const isProvider = ['photographer', 'videographer', 'both'].includes(u.userType);
      const filterField = isProvider ? 'provider' : 'client';

      strapi.get('/bookings', {
        params: {
          [`filters[${filterField}][id]`]: u.id,
          populate: 'client.avatar,provider.avatar',
          sort: 'createdAt:desc',
          'pagination[pageSize]': 5,
        },
      })
      .then((res) => setBookings(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const isProvider = user && ['photographer', 'videographer', 'both'].includes(user.userType);

  const stats = [
    {
      label: 'Rating',
      value: user?.rating ? user.rating.toFixed(1) : '—',
      sub: `${user?.totalReviews || 0} reviews`,
      icon: Star,
      color: 'text-gold-400',
    },
    {
      label: 'Completed',
      value: user?.completedBookings || 0,
      sub: 'bookings',
      icon: Calendar,
      color: 'text-emerald-500',
    },
    {
      label: 'Profile',
      value: isProvider ? 'Creator' : 'Client',
      sub: user?.city || 'UAE',
      icon: TrendingUp,
      color: 'text-brand-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.displayName || user?.username} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
              <div className={`p-2 rounded-xl bg-gray-100 dark:bg-gray-800 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/dashboard/profile', label: 'Edit Profile', icon: '👤' },
          { href: '/dashboard/portfolio', label: 'Add Work', icon: '🖼️' },
          { href: '/dashboard/bookings', label: 'My Bookings', icon: '📅' },
          { href: '/dashboard/feed', label: 'Share Post', icon: '📸' },
        ].map(({ href, label, icon }) => (
          <Link key={href} href={href} className="card-hover p-4 text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Bookings</h2>
          <Link href="/dashboard/bookings" className="text-sm text-brand-500 flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No bookings yet</p>
            {!isProvider && (
              <Link href="/photographers" className="mt-3 btn-primary inline-flex">
                Find Photographers
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {bookings.map((booking) => {
              const { label, color } = bookingStatusLabel(booking.status);
              const other = isProvider ? booking.client : booking.provider;
              return (
                <div key={booking.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {booking.eventType} · {other?.displayName || other?.username}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(booking.eventDate, 'MMM d, yyyy · HH:mm')} · {booking.city}
                    </p>
                  </div>
                  <span className={`badge ${color} flex-shrink-0`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile completion reminder */}
      {isProvider && !user?.bio && (
        <div className="card p-5 border-l-4 border-brand-500 bg-brand-50 dark:bg-brand-900/10">
          <div className="flex items-start gap-3">
            <Images className="h-5 w-5 text-brand-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Complete your profile</p>
              <p className="text-sm text-gray-500 mt-0.5">Add a bio, portfolio, and pricing to attract clients.</p>
              <Link href="/dashboard/profile" className="mt-2 btn-primary text-xs px-4 py-2 inline-flex">
                Complete Profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
