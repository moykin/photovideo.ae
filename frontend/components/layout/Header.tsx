'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Compass, Camera, BookOpen, Menu, X, User, LogOut, Settings, LayoutDashboard, Download } from 'lucide-react';
import { Emblem } from '@/components/Emblem';
import { cn } from '@/lib/utils';
import { getStoredUser, signOut } from '@/lib/auth';
import type { User as UserType } from '@/lib/types';
import { getMediaUrl } from '@/lib/strapi';
import { Button } from '@/components/ui';

const navLinks = [
  { href: '/feed', label: 'Discover', icon: Compass },
  { href: '/photographers', label: 'Photographers', icon: Camera },
  { href: '/blog', label: 'Resources', icon: BookOpen },
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
          ? 'bg-cream/90 backdrop-blur-md shadow-soft border-b border-sand-300'
          : 'bg-cream/70 backdrop-blur-sm border-b border-transparent'
      )}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-cream">
              <Emblem className="h-6 w-6" />
            </div>
            <span className="hidden sm:block font-display font-semibold text-xl text-ink">
              Photo<span className="text-gold-500">Video</span>
              <span className="text-ink-300">.ae</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, external }) =>
              external ? (
                <a key={href} href={href} className="btn-ghost">
                  {label}
                </a>
              ) : (
                <Link key={href} href={href} className="btn-ghost">
                  {label}
                </Link>
              )
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link href="/auth/register" className="hidden md:inline-flex">
              <Button size="sm" variant="primary">Become a pro</Button>
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-pill px-1.5 py-1.5 hover:bg-cream-300 transition-colors"
                >
                  {user.avatar ? (
                    <Image
                      src={getMediaUrl(user.avatar.url)}
                      alt={user.displayName || user.username}
                      width={34}
                      height={34}
                      className="rounded-full object-cover ring-2 ring-sand-300"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gradient-brand flex items-center justify-center text-cream text-sm font-bold">
                      {(user.displayName || user.username).slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-12 w-52 card shadow-card py-1 z-50">
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-300" onClick={() => setDropdownOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link href="/dashboard/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-300" onClick={() => setDropdownOpen(false)}>
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-300" onClick={() => setDropdownOpen(false)}>
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <a href={process.env.NEXT_PUBLIC_YT2GDRIVE_URL ?? 'http://localhost:8080'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-300" onClick={() => setDropdownOpen(false)}>
                      <Download className="h-4 w-4" /> YT Downloader
                    </a>
                    <hr className="my-1 border-sand-300" />
                    <button onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/login" className="btn-ghost hidden sm:flex">Sign In</Link>
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
        <div className="md:hidden border-t border-sand-300 bg-cream-50 px-4 py-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon, external }) =>
            external ? (
              <a
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-ink-600 hover:bg-cream-300 font-medium transition-colors"
                onClick={() => setOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-ink-600 hover:bg-cream-300 font-medium transition-colors"
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
              <Link href="/auth/register" className="btn-primary w-full" onClick={() => setOpen(false)}>Become a pro</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
