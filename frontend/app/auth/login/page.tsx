'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { signIn } from '@/lib/auth';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField, AuthDivider } from '@/components/auth/AuthField';

const schema = z.object({
  identifier: z.string().min(1, 'Required'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await signIn(data.identifier, data.password);
      router.push(redirect);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <AuthLayout
      headline="Welcome back to the studio."
      subline="Sign in to manage bookings, your portfolio and messages."
      quote={{
        text: 'PhotoVideo.ae brought me clients across Dubai and Abu Dhabi within weeks.',
        author: 'Layla A. — Wedding Photographer',
      }}
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-500">Sign in to your account</p>
      </div>

      <OAuthButtons mode="signin" />

      <AuthDivider label="or continue with email" />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <AuthField
          label="Email or Username"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.identifier?.message}
          {...register('identifier')}
        />

        <AuthField
          label="Password"
          type={showPass ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          suffix={
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="text-ink-300 transition-colors hover:text-ink-600"
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link href="/auth/forgot-password" className="text-sm font-medium text-gold-600 hover:text-gold-700">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-gold-500 px-6 py-3.5 text-sm font-semibold text-cream shadow-gold transition-all hover:bg-gold-600 active:scale-[0.99] disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="font-semibold text-gold-600 hover:text-gold-700">
          Join free
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
