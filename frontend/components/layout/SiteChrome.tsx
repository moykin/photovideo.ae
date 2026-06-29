'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

/**
 * SiteChrome — decides whether to wrap the page in the global header/footer.
 *
 * Auth pages (/auth/*) use AuthLayout, a full-screen split shell with its own
 * logo and footer line. Rendering the global Header there produced two logos
 * (navbar logo + AuthLayout logo) and a stray footer, so we hide the chrome
 * on those routes and let the page own the whole viewport.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname?.startsWith('/auth');

  if (bare) return <>{children}</>;

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
