'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MailCheck } from 'lucide-react';
import { forgotPassword } from '@/lib/strapi';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setSentTo(data.email);
    try {
      await forgotPassword(data.email);
    } catch {
      // Strapi не раскрывает, существует ли email — всё равно показываем успех.
    }
    setSent(true);
  };

  return (
    <AuthLayout
      headline="Reset your password."
      subline="We’ll email you a secure link to set a new password."
    >
      {sent ? (
        <div className="flex flex-col items-start">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-300 text-gold-600">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-medium text-ink">Check your email</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            If an account exists for <span className="font-medium text-ink">{sentTo}</span>, we’ve sent a
            password reset link. Check your inbox (and spam folder) and follow the link to choose a new password.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-6 text-sm font-medium text-gold-600 hover:text-gold-700"
          >
            Use a different email
          </button>
          <Link href="/auth/login" className="mt-3 text-sm text-ink-500 hover:text-ink">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="font-display text-3xl font-medium text-ink">Forgot password?</h1>
            <p className="mt-1 text-sm text-ink-500">Enter your email and we’ll send a reset link.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AuthField
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-pill bg-gold-500 px-6 py-3.5 text-sm font-semibold text-cream shadow-gold transition-all hover:bg-gold-600 active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Remembered it?{' '}
            <Link href="/auth/login" className="font-semibold text-gold-600 hover:text-gold-700">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
