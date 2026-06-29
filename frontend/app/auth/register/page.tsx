'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Video, User, Loader2 } from 'lucide-react';
import { signUp } from '@/lib/auth';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField, AuthDivider } from '@/components/auth/AuthField';

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

function RegisterForm() {
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
    <AuthLayout
      eyebrow="Become a pro"
      headline="Turn your work into bookings."
      subline="Build a stunning portfolio and get discovered by clients across the UAE."
      image="https://photovideo-ae-media.s3.ap-south-1.amazonaws.com/auth_hero_signup.jpg"
      quote={{
        text: 'I went from side gigs to a fully booked calendar in my first season.',
        author: 'Omar K. — Videographer, Abu Dhabi',
      }}
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-500">Join the UAE&apos;s creative community</p>
      </div>

      <OAuthButtons mode="signup" />

      <AuthDivider label="or sign up with email" />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Account type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-600">I am a...</label>
          <div className="grid grid-cols-2 gap-2.5">
            {typeOptions.map(({ value, label, icon: Icon, desc }) => {
              const active = userType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('userType', value)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? 'border-gold-400 bg-gold-50 shadow-soft'
                      : 'border-sand-300 bg-cream-50 hover:border-gold-300'
                  }`}
                >
                  <Icon className={`mb-1 h-5 w-5 ${active ? 'text-gold-600' : 'text-ink-300'}`} />
                  <p className={`text-sm font-semibold ${active ? 'text-gold-700' : 'text-ink-600'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-ink-300">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <AuthField
          label="Full Name"
          placeholder="John Smith"
          error={errors.displayName?.message}
          {...register('displayName')}
        />

        <AuthField
          label="Username"
          placeholder="johnsmith"
          leftAdornment="@"
          error={errors.username?.message}
          {...register('username')}
        />

        <AuthField
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <AuthField
          label="Password"
          type="password"
          placeholder="Min 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-gold-500 px-6 py-3.5 text-sm font-semibold text-cream shadow-gold transition-all hover:bg-gold-600 active:scale-[0.99] disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>

        <p className="text-center text-xs text-ink-300">
          By registering you agree to our{' '}
          <Link href="/terms" className="text-gold-600 hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-gold-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-gold-600 hover:text-gold-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
