import Link from 'next/link';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import { Logo } from '@/components/Logo';

const links = {
  Discover: [
    { href: '/photographers', label: 'Photographers' },
    { href: '/videographers', label: 'Videographers' },
    { href: '/feed', label: 'Creative Feed' },
    { href: '/blog', label: 'Resources' },
  ],
  Company: [
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
    { href: '/careers', label: 'Careers' },
  ],
  Legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/cookies', label: 'Cookies' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-ink text-ink-300 mt-auto">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo tone="light" className="mb-4" />
            <p className="text-sm leading-relaxed mb-6 text-ink-300">
              The UAE&apos;s home for discovering and booking talented photographers and videographers.
            </p>
            <div className="flex gap-3">
              <a href="https://instagram.com/photovideo.ae" target="_blank" rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-700 text-cream hover:bg-gold-500 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://facebook.com/photovideo.ae" target="_blank" rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-700 text-cream hover:bg-gold-500 transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://youtube.com/@photovideo.ae" target="_blank" rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-700 text-cream hover:bg-gold-500 transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gold-300 uppercase tracking-[0.16em] mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {items.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-ink-300 hover:text-cream transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-ink-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-ink-400">
            © {new Date().getFullYear()} PhotoVideo.ae. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-ink-400">
            Made with care for creators in the UAE
            <svg viewBox="0 0 24 12" role="img" aria-label="UAE flag" className="h-3 w-6 rounded-[2px] ring-1 ring-white/10">
              <rect width="24" height="12" fill="#fff" />
              <rect x="6" width="18" height="4" fill="#00732f" />
              <rect x="6" y="8" width="18" height="4" fill="#000" />
              <rect width="6" height="12" fill="#ff0000" />
            </svg>
          </p>
        </div>
      </div>
    </footer>
  );
}
