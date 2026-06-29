import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRating } from '@/lib/utils';

export interface RatingProps {
  value: number;
  count?: number;
  /** Show 5 stars instead of a single star + number */
  showStars?: boolean;
  size?: number;
  className?: string;
}

/** Star rating. Default: single gold star + numeric value (+ optional review count). */
export function Rating({ value, count, showStars = false, size = 16, className }: RatingProps) {
  if (showStars) {
    return (
      <div className={cn('flex items-center gap-0.5', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(
              i < Math.round(value) ? 'fill-gold-400 text-gold-400' : 'fill-sand-300 text-sand-300',
            )}
          />
        ))}
        {typeof count === 'number' && (
          <span className="ml-1 text-xs text-ink-300">({count})</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Star style={{ width: size, height: size }} className="fill-gold-400 text-gold-400" />
      <span className="text-sm font-semibold text-ink">{formatRating(value)}</span>
      {typeof count === 'number' && <span className="text-xs text-ink-300">({count})</span>}
    </div>
  );
}
