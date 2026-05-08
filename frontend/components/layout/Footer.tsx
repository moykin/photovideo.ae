import Link from 'next/link';
import { Camera, Instagram, Facebook, Youtube } from 'lucide-react';

const links = {
  Platform: [
    { href: '/photographers', label: 'Photographers' },
    { href: '/videographers', label: 'Videographers' },
    { href: '/feed', label: 'Creative Feed' },
    { href: '/blog', label: 'Blog' },
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
    <footer className="bg-gray-950 text-gray-400 mt-auto">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-white">
                Photo<span className="text-brand-400">Video</span>.ae
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-6">
              The UAE&apos;s #1 platform to discover and book talented photographers and videographers.
            </p>
            <div className="flex gap-3">
              <a href="https://instagram.com/photovideo.ae" target="_blank" rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-800 hover:bg-brand-500 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://facebook.com/photovideo.ae" target="_blank" rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-800 hover:bg-brand-500 transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://youtube.com/@photovideo.ae" target="_blank" rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-800 hover:bg-brand-500 transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {items.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            © {new Date().getFullYear()} PhotoVideo.ae. All rights reserved.
          </p>
          <p className="text-xs">
            Made with love for creators in the UAE
          </p>
        </div>
      </div>
    </footer>
  );
}
