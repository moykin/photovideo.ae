'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Video, User, Loader2 } from 'lucide-react';
import { signUp } from '@/lib/auth';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

const schema = z.object({
  displayName: z.string().min(2, 'Minimum 2 characters'),
  username: z.string().min(3, 'Minimum 3 characters').regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, _'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  userType: z.enum(['photographer', 'videographer', 'both', 'client']),
});

type FormData = z.infer<typeof schema>;

const typeOptions = [
  { value: 'photographer', label: 'Photographer', icon: Camera, desc: 'I shoot photos' },
  { value: 'videographer', label: 'Videographer', icon: Video, desc: 'I shoot video' },
  { value: 'both', label: 'Photo & Video', icon: Camera, desc: 'Both' },
  { value: 'client', label: 'Client', icon: User, desc: 'I want to hire' },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = (searchParams.get('type') as FormData['userType']) || 'client';
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { userType: defaultType },
  });

  const userType = watch('userType');

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await signUp(data);
      router.push('/dashboard/profile?onboarding=1');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-gray-900 dark:text-white">
              Photo<span className="gradient-text">Video</span>.ae
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-gray-500 mt-1">Join the UAE&apos;s creative community</p>
        </div>

        <div className="card p-8">
          {/* OAuth кнопки */}
          <OAuthButtons mode="signup" />

          {/* Разделитель */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">or sign up with email</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Account type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-2">
                {typeOptions.map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('userType', value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      userType === value
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${userType === value ? 'text-brand-500' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${userType === value ? 'text-brand-600 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <input {...register('displayName')} placeholder="John Smith" className="input" />
              {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input {...register('username')} placeholder="johnsmith" className="input pl-8" />
              </div>
              {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input {...register('email')} type="email" placeholder="you@example.com" className="input" autoComplete="email" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <input {...register('password')} type="password" placeholder="Min 8 characters" className="input" autoComplete="new-password" />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : 'Create Account'}
            </button>

            <p className="text-xs text-center text-gray-400">
              By registering you agree to our{' '}
              <Link href="/terms" className="text-brand-500 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-brand-500 hover:underline">Privacy Policy</Link>.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-500 hover:text-brand-600 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
