'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Camera, Quote } from 'lucide-react';

interface Props {
  /** Form column content (already includes heading + form). */
  children: ReactNode;
  /** Background photo for the editorial panel. */
  image?: string;
  /** Small eyebrow shown above the panel headline. */
  eyebrow?: string;
  /** Large serif headline on the photo panel. */
  headline?: string;
  /** Supporting line under the headline. */
  subline?: string;
  /** Optional pull-quote shown near the bottom of the panel. */
  quote?: { text: string; author: string };
}

/**
 * AuthLayout — elegant split-screen shell for the redesigned auth pages.
 * Left: cream form column. Right (lg+): warm editorial photo panel with an
 * ink gradient scrim, serif headline and a pull-quote. Matches the warm
 * marketplace design language (cream / gold / ink).
 */
export function AuthLayout({
  children,
  image = 'https://photovideo-ae-media.s3.ap-south-1.amazonaws.com/auth_hero.jpg',
  eyebrow = 'PhotoVideo.ae',
  headline = "The Emirates' finest photo & video pros.",
  subline = 'Join the curated creative community trusted across the UAE.',
  quote,
}: Props) {
  return (
    <div className="min-h-screen w-full bg-cream lg:grid lg:grid-cols-2">
      {/* Form column */}
      <div className="flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 self-start">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-cream">
            <Camera className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold text-ink">
            Photo<span className="text-gold-500">Video</span>
            <span className="text-ink-300">.ae</span>
          </span>
        </Link>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <p className="text-center text-xs text-ink-300">
          &copy; {new Date().getFullYear()} PhotoVideo.ae &middot; Made in the UAE
        </p>
      </div>

      {/* Editorial photo panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
          aria-hidden
        />
        {/* warm ink scrim */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(34,28,21,0.25) 0%, rgba(34,28,21,0.55) 55%, rgba(28,23,16,0.88) 100%)',
          }}
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-end p-14 text-cream">
          <span className="mb-4 inline-flex w-fit items-center rounded-pill border border-gold-300/40 bg-ink-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-300 backdrop-blur-sm">
            {eyebrow}
          </span>
          <h2 className="max-w-md font-display text-4xl font-medium leading-tight xl:text-5xl">
            {headline}
          </h2>
          <p className="mt-4 max-w-sm text-sm text-cream-500/90">{subline}</p>

          {quote && (
            <figure className="mt-10 max-w-sm rounded-3xl border border-cream/10 bg-ink-900/30 p-6 backdrop-blur-sm">
              <Quote className="h-6 w-6 text-gold-400" />
              <blockquote className="mt-3 font-display text-lg leading-snug text-cream">
                &ldquo;{quote.text}&rdquo;
              </blockquote>
              <figcaption className="mt-3 text-xs uppercase tracking-wide text-cream-500/80">
                {quote.author}
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </div>
  );
}
