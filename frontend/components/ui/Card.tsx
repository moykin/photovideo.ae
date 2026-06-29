import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  dark?: boolean;
}

export function Card({ className, hover = false, dark = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden border transition-all duration-200',
        dark
          ? 'bg-ink border-ink-700 text-cream'
          : 'bg-cream-50 border-sand-300 shadow-soft',
        hover && 'hover:shadow-card hover:-translate-y-0.5',
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
