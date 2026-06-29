import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { Providers } from '@/components/Providers';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
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
  alternates: {
    canonical: 'https://photovideo.ae',
  },
  openGraph: {
    type: 'website',
    locale: 'en_AE',
    url: 'https://photovideo.ae',
    siteName: 'PhotoVideo.ae',
    title: 'PhotoVideo.ae — Book Photographers & Videographers in UAE',
    description: 'Find and book the best photographers and videographers in UAE.',
    images: [{ url: 'https://photovideo.ae/download/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PhotoVideo.ae',
    description: 'Find and book the best photographers and videographers in UAE.',
    images: ['https://photovideo.ae/download/og-image.png'],
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
    <html lang="en" className={`${jakarta.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/emblem.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-DMNMF9MNFX" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-DMNMF9MNFX');` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "PhotoVideo.ae",
          "url": "https://photovideo.ae",
          "logo": "https://photovideo.ae/download/og-image.png",
          "description": "UAE's creative marketplace for photographers and videographers. Book professionals in Dubai, Abu Dhabi and across the UAE.",
          "sameAs": ["https://photovideo.ae/download"],
          "areaServed": { "@type": "Country", "name": "United Arab Emirates" },
        }) }} />
      </head>
      <body className="min-h-screen flex flex-col bg-cream text-ink-500 antialiased">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
