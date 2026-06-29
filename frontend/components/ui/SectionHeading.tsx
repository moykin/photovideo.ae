import { cn } from '@/lib/utils';

export interface SectionHeadingProps {
  /** Small gold eyebrow label above the title */
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center';
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex w-full gap-4',
        align === 'center'
          ? 'flex-col items-center text-center'
          : 'flex-col sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.18em] text-gold-500">
            {eyebrow}
          </span>
        )}
        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {subtitle && <p className="mt-2 text-sm sm:text-base text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
