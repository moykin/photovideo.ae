import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PhotoVideo.ae — Book Photographers & Videographers in UAE',
    template: '%s | PhotoVideo.ae',
  },
  description:
    'Find and book the best photographers and videographers in Dubai, Abu Dhabi, and across the UAE. Browse portfolios, read reviews, and book instantly.',
  keywords: ['photographer UAE', 'videographer Dubai', 'book photographer', 'photography UAE', 'wedding photographer Dubai'],
  authors: [{ name: 'PhotoVideo.ae' }],
  creator: 'PhotoVideo.ae',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://photovideo.ae'),
  openGraph: {
    type: 'website',
    locale: 'en_AE',
    url: 'https://photovideo.ae',
    siteName: 'PhotoVideo.ae',
    title: 'PhotoVideo.ae — Book Photographers & Videographers in UAE',
    description: 'Find and book the best photographers and videographers in UAE.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PhotoVideo.ae',
    description: 'Find and book the best photographers and videographers in UAE.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-DMNMF9MNFX" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-DMNMF9MNFX');` }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
