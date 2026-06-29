import Link from 'next/link';
import { Emblem } from './Emblem';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** Extra layout classes (e.g. self-start, mb-4). */
  className?: string;
  /** Wordmark colour context: 'dark' for light backgrounds, 'light' for dark. */
  tone?: 'dark' | 'light';
  /** Link target; pass null to render a non-link (plain) lockup. */
  href?: string | null;
  /** Hide the "PhotoVideo.ae" wordmark on small screens (used in the header). */
  hideTextOnMobile?: boolean;
}

/**
 * Logo — the single source of truth for the PhotoVideo.ae brand lockup.
 *
 * Mark matches the favicon exactly: a dark near-black tile, a white camera
 * frame (rendered via <Emblem/> in white) and a red centre dot. Used in the
 * header, footer and auth pages so the logo is identical everywhere.
 */
export function Logo({ className, tone = 'dark', href = '/', hideTextOnMobile = false }: LogoProps) {
  const inner = (
    <>
      {/* Favicon-matched tile: near-black bg, white frame + ticks, red dot */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1a0e2e] text-white">
        <Emblem className="h-6 w-6" />
      </span>
      <span
        className={cn(
          'font-display text-xl font-semibold',
          hideTextOnMobile && 'hidden sm:block',
          tone === 'light' ? 'text-cream' : 'text-ink'
        )}
      >
        Photo
        <span className={tone === 'light' ? 'text-gold-300' : 'text-gold-500'}>Video</span>
        <span className={tone === 'light' ? 'text-cream-500/70' : 'text-ink-300'}>.ae</span>
      </span>
    </>
  );

  if (href === null) {
    return <span className={cn('inline-flex items-center gap-2', className)}>{inner}</span>;
  }

  return (
    <Link href={href} className={cn('inline-flex items-center gap-2', className)}>
      {inner}
    </Link>
  );
}
