'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, User, Images, Calendar, BookOpen,
  Settings, LogOut, ChevronRight,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { getStoredUser, signOut } from '@/lib/auth';
import { cn, getInitials } from '@/lib/utils';
import type { User as UserType } from '@/lib/types';
import { getMediaUrl } from '@/lib/strapi';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/portfolio', label: 'Portfolio', icon: Images },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/feed', label: 'My Feed', icon: BookOpen },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) { router.push('/auth/login?redirect=/dashboard'); return; }
    setUser(u);
  }, [router]);

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex h-16 items-center px-5 border-b border-gray-200 dark:border-gray-800">
          <Logo />
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-brand">
            {user.avatar ? (
              <Image src={getMediaUrl(user.avatar.url)} alt={user.displayName || user.username} fill className="object-cover" sizes="40px" />
            ) : (
              <span className="h-full w-full flex items-center justify-center text-white text-sm font-bold">
                {getInitials(user.displayName || user.username)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user.displayName || user.username}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user.userType}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(href, exact)
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
              {isActive(href, exact) && <ChevronRight className="h-3 w-3 ml-auto" />}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:pl-64">
        {/* Mobile header */}
        <div className="lg:hidden flex h-14 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <span className="font-semibold text-gray-900 dark:text-white">Dashboard</span>
          <button onClick={signOut} className="btn-ghost p-2 text-red-500">
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors',
                isActive(href, exact)
                  ? 'text-brand-500'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden xs:block">{label.split(' ')[0]}</span>
            </Link>
          ))}
        </nav>

        <main className="p-4 sm:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
