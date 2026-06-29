'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '@/lib/strapi';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';

const schema = z
  .object({
    password: z.string().min(6, 'Minimum 6 characters'),
    passwordConfirmation: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  });

type FormData = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const code = useSearchParams().get('code') || '';
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    if (!code) {
      setError('This reset link is invalid or missing its code.');
      return;
    }
    try {
      await resetPassword(code, data.password, data.passwordConfirmation);
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 1600);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message;
      setError(message || 'This reset link is invalid or expired. Please request a new one.');
    }
  };

  return (
    <AuthLayout headline="Set a new password." subline="Choose a strong password to secure your account.">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-ink">New password</h1>
        <p className="mt-1 text-sm text-ink-500">Enter a new password for your account.</p>
      </div>

      {!code && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          This reset link is invalid.{' '}
          <Link href="/auth/forgot-password" className="font-semibold underline">
            Request a new one
          </Link>
          .
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {done ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Password updated! Redirecting you to sign in…
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AuthField
            label="New password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
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

          <AuthField
            label="Confirm password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.passwordConfirmation?.message}
            {...register('passwordConfirmation')}
          />

          <button
            type="submit"
            disabled={isSubmitting || !code}
            className="flex w-full items-center justify-center gap-2 rounded-pill bg-gold-500 px-6 py-3.5 text-sm font-semibold text-cream shadow-gold transition-all hover:bg-gold-600 active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-500">
        <Link href="/auth/login" className="font-semibold text-gold-600 hover:text-gold-700">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
