'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Calendar, MapPin, Clock } from 'lucide-react';
import type { User, BookingFormData } from '@/lib/types';
import { createBooking } from '@/lib/strapi';

const schema = z.object({
  serviceType: z.enum(['photography', 'videography', 'both']),
  eventType: z.string().min(2, 'Required'),
  eventDate: z.string().min(1, 'Required'),
  duration: z.coerce.number().min(1).max(24),
  location: z.string().min(3, 'Required'),
  city: z.string().min(1, 'Required'),
  clientNotes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const EVENT_TYPES = [
  'Wedding', 'Engagement', 'Corporate Event', 'Birthday', 'Product Shoot',
  'Fashion Shoot', 'Real Estate', 'Portrait Session', 'Sports Event', 'Other',
];

const UAE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'];

interface Props {
  provider: User;
  onClose: () => void;
}

export function BookingModal({ provider, onClose }: Props) {
  const [success, setSuccess] = useState(false);
  const [refCode, setRefCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'photography', duration: 4, city: 'Dubai' },
  });

  const onSubmit = async (data: FormData) => {
    const booking = await createBooking({
      ...data,
      provider: provider.id,
    } as BookingFormData);
    setRefCode(booking.referenceCode);
    setSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Book {provider.displayName || provider.username}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-4">
              <Calendar className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Request Sent!</h3>
            <p className="text-gray-500 mb-1">Your booking reference:</p>
            <p className="text-2xl font-mono font-bold text-brand-500 mb-4">{refCode}</p>
            <p className="text-sm text-gray-400 mb-6">
              {provider.displayName || provider.username} will respond within 24 hours.
              Check your dashboard for updates.
            </p>
            <div className="flex gap-3">
              <a href="/dashboard/bookings" className="btn-primary flex-1">View Bookings</a>
              <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
            {/* Service type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['photography', 'videography', 'both'] as const).map((type) => (
                  <label key={type} className="cursor-pointer">
                    <input type="radio" value={type} {...register('serviceType')} className="sr-only peer" />
                    <div className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-center capitalize transition-all peer-checked:border-brand-500 peer-checked:bg-brand-50 dark:peer-checked:bg-brand-900/20 peer-checked:text-brand-600 hover:border-brand-300">
                      {type}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Event type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type
              </label>
              <select {...register('eventType')} className="input">
                <option value="">Select event type</option>
                {EVENT_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              {errors.eventType && <p className="text-xs text-red-500 mt-1">{errors.eventType.message}</p>}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Event Date & Time</span>
              </label>
              <input
                type="datetime-local"
                {...register('eventDate')}
                min={new Date().toISOString().slice(0, 16)}
                className="input"
              />
              {errors.eventDate && <p className="text-xs text-red-500 mt-1">{errors.eventDate.message}</p>}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Duration (hours)</span>
              </label>
              <input type="number" {...register('duration')} min={1} max={24} className="input" />
              {errors.duration && <p className="text-xs text-red-500 mt-1">{errors.duration.message}</p>}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
              <select {...register('city')} className="input">
                {UAE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Location / Venue</span>
              </label>
              <input
                type="text"
                {...register('location')}
                placeholder="e.g. Burj Khalifa, Downtown Dubai"
                className="input"
              />
              {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location.message}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                {...register('clientNotes')}
                rows={3}
                placeholder="Any special requirements, style preferences..."
                className="input resize-none"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Calendar className="h-4 w-4" /> Send Booking Request</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
