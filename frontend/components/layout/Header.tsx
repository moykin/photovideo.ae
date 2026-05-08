'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Camera, Video, BookOpen, Newspaper, Menu, X, User, LogOut, Settings, LayoutDashboard, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStoredUser, signOut } from '@/lib/auth';
import type { User as UserType } from '@/lib/types';
import { getMediaUrl } from '@/lib/strapi';

const navLinks = [
  { href: '/photographers', label: 'Photographers', icon: Camera },
  { href: '/videographers', label: 'Videographers', icon: Video },
  { href: '/feed', label: 'Feed', icon: BookOpen },
  { href: '/blog', label: 'Blog', icon: Newspaper },
  { href: '/download', label: 'YT Downloader', icon: Download, external: true },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="hidden sm:block font-display font-bold text-lg text-gray-900 dark:text-white">
              Photo<span className="gradient-text">Video</span>.ae
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, external }) =>
              external ? (
                <a
                  key={href}
                  href={href}
                  className="btn-ghost text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="btn-ghost text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {label}
                </Link>
              )
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {user.avatar ? (
                    <Image
                      src={getMediaUrl(user.avatar.url)}
                      alt={user.displayName || user.username}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold">
                      {(user.displayName || user.username).slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-gray-900 dark:text-white">
                    {user.displayName || user.username}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-12 w-48 card shadow-xl py-1 z-50">
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setDropdownOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link href="/dashboard/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setDropdownOpen(false)}>
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setDropdownOpen(false)}>
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <a href={process.env.NEXT_PUBLIC_YT2GDRIVE_URL ?? 'http://localhost:8080'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setDropdownOpen(false)}>
                      <Download className="h-4 w-4" /> YT Downloader
                    </a>
                    <hr className="my-1 border-gray-100 dark:border-gray-800" />
                    <button onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost hidden sm:flex">Sign In</Link>
                <Link href="/auth/register" className="btn-primary">Join Free</Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden btn-ghost p-2"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon, external }) =>
            external ? (
              <a
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
                onClick={() => setOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
                onClick={() => setOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            )
          )}
          {!user && (
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/auth/login" className="btn-secondary w-full" onClick={() => setOpen(false)}>Sign In</Link>
              <Link href="/auth/register" className="btn-primary w-full" onClick={() => setOpen(false)}>Join Free</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
