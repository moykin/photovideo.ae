'use client';

/**
 * /auth/callback — страница обработки OAuth редиректа от Strapi
 *
 * v1.0 — initial: Strapi после успешной OAuth авторизации (Google/Facebook/Apple)
 *         редиректит на эту страницу с ?access_token=xxx в URL.
 *         Страница сохраняет токен, загружает профиль пользователя,
 *         сохраняет в localStorage и редиректит в dashboard.
 *
 * URL Strapi генерирует: FRONTEND_URL/auth/callback?access_token=xxx
 * Настраивается в: Strapi Admin → Settings → Users & Permissions → Providers
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Loader2, AlertCircle } from 'lucide-react';
import { setSession } from '@/lib/auth';
import { getMe } from '@/lib/strapi';
import { strapi } from '@/lib/strapi';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('access_token');

    if (!token) {
      setError('No access token received. Please try again.');
      return;
    }

    // Временно ставим токен в axios чтобы загрузить профиль
    strapi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('jwt', token);

    getMe()
      .then((user) => {
        // Сохраняем сессию и редиректим
        setSession(token, user);
        // Новый пользователь через OAuth → онбординг
        const isNew = !user.displayName || !user.userType || user.userType === 'client';
        router.replace(isNew ? '/dashboard/profile?onboarding=1' : '/dashboard');
      })
      .catch((err) => {
        console.error('OAuth callback error:', err);
        localStorage.removeItem('jwt');
        setError('Failed to load your profile. Please try again.');
      });
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Authentication failed</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <a href="/auth/login" className="btn-primary">
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-brand mx-auto mb-4">
          <Camera className="h-7 w-7 text-white" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-brand-500 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Signing you in...</p>
      </div>
    </div>
  );
}
