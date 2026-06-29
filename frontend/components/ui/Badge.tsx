import { cn } from '@/lib/utils';

type Tone = 'gold' | 'neutral' | 'dark' | 'success' | 'glass';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  gold: 'bg-gold-100 text-gold-600',
  neutral: 'bg-cream-300 text-ink-500',
  dark: 'bg-ink text-cream',
  success: 'bg-emerald-100 text-emerald-700',
  glass: 'bg-black/50 text-white backdrop-blur-sm',
};

/** Pill-shaped status / label badge. */
export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Bordered category/tag pill (e.g. "Weddings"). */
export function Chip({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border border-sand-300 bg-cream-50',
        'px-3.5 py-1.5 text-xs font-medium text-ink-500 transition-colors',
        'hover:border-gold-300 hover:text-ink',
        className,
      )}
      {...props}
    />
  );
}

/** Lightweight inline tag chip used inside cards. */
export function Tag({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill bg-cream-300 px-2 py-0.5 text-xs text-ink-500',
        className,
      )}
      {...props}
    />
  );
}
