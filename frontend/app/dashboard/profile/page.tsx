'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save, Upload } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { updateMe, strapi } from '@/lib/strapi';
import { SPECIALIZATIONS, LANGUAGES } from '@/lib/utils';
import type { User } from '@/lib/types';

const UAE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'];
const CURRENCIES = ['AED', 'USD'];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm();

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u) {
      reset({
        displayName: u.displayName || '',
        bio: u.bio || '',
        city: u.city || 'Dubai',
        country: u.country || 'UAE',
        phone: u.phone || '',
        experience: u.experience || '',
        pricePerHour: u.pricePerHour || '',
        pricePerEvent: u.pricePerEvent || '',
        currency: u.currency || 'AED',
        equipment: u.equipment || '',
        isAvailable: u.isAvailable ?? true,
        'socialLinks.instagram': u.socialLinks?.instagram || '',
        'socialLinks.facebook': u.socialLinks?.facebook || '',
        'socialLinks.tiktok': u.socialLinks?.tiktok || '',
        'socialLinks.youtube': u.socialLinks?.youtube || '',
        'socialLinks.website': u.socialLinks?.website || '',
        'socialLinks.behance': u.socialLinks?.behance || '',
        'socialLinks.vimeo': u.socialLinks?.vimeo || '',
        'socialLinks.telegram': u.socialLinks?.telegram || '',
      });
    }
  }, [reset]);

  const isProvider = user && ['photographer', 'videographer', 'both'].includes(user.userType);

  const onSubmit = async (data: Record<string, unknown>) => {
    const payload: Record<string, unknown> = { ...data };
    // reconstruct socialLinks from flat keys
    payload.socialLinks = {
      instagram: data['socialLinks.instagram'],
      facebook: data['socialLinks.facebook'],
      tiktok: data['socialLinks.tiktok'],
      youtube: data['socialLinks.youtube'],
      website: data['socialLinks.website'],
      behance: data['socialLinks.behance'],
      vimeo: data['socialLinks.vimeo'],
      telegram: data['socialLinks.telegram'],
    };
    // clean up flat keys
    Object.keys(payload).filter((k) => k.startsWith('socialLinks.')).forEach((k) => delete payload[k]);

    await updateMe(payload);
    const updated = { ...user, ...payload };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated as User);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Basic Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display Name</label>
              <input {...register('displayName')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
              <input {...register('phone')} placeholder="+971 50 123 4567" className="input" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bio</label>
            <textarea {...register('bio')} rows={4} maxLength={1000} placeholder="Tell clients about yourself, your style, and experience..." className="input resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">City</label>
              <select {...register('city')} className="input">
                {UAE_CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Availability</label>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input type="checkbox" {...register('isAvailable')} className="h-4 w-4 rounded accent-brand-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Available for bookings</span>
              </label>
            </div>
          </div>
        </div>

        {/* Professional (provider only) */}
        {isProvider && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Professional Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Experience (years)</label>
                <input {...register('experience')} type="number" min="0" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Currency</label>
                <select {...register('currency')} className="input">
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price / Hour</label>
                <input {...register('pricePerHour')} type="number" min="0" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price / Event</label>
                <input {...register('pricePerEvent')} type="number" min="0" className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Equipment / Gear</label>
              <textarea {...register('equipment')} rows={2} placeholder="Camera bodies, lenses, lighting equipment..." className="input resize-none" />
            </div>
          </div>
        )}

        {/* Social links */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Social Media & Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
              { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
              { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
              { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
              { key: 'website', label: 'Website', placeholder: 'https://...' },
              { key: 'behance', label: 'Behance', placeholder: 'https://behance.net/...' },
              { key: 'vimeo', label: 'Vimeo', placeholder: 'https://vimeo.com/...' },
              { key: 'telegram', label: 'Telegram', placeholder: 'https://t.me/...' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                <input {...register(`socialLinks.${key}`)} placeholder={placeholder} className="input text-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary">
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4" /> Save Changes</>
            )}
          </button>
          {saved && (
            <span className="text-sm text-emerald-500 font-medium">✓ Saved successfully</span>
          )}
        </div>
      </form>
    </div>
  );
}
