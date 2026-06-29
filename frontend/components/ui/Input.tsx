import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300">
            {icon}
          </span>
          <input
            ref={ref}
            className={cn(
              'w-full rounded-pill border border-sand-300 bg-cream-50 pl-10 pr-4 py-3 text-sm',
              'text-ink placeholder-ink-300 outline-none transition-all duration-200',
              'focus:ring-2 focus:ring-gold-300 focus:border-transparent',
              className,
            )}
            {...props}
          />
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl border border-sand-300 bg-cream-50 px-4 py-3 text-sm',
          'text-ink placeholder-ink-300 outline-none transition-all duration-200',
          'focus:ring-2 focus:ring-gold-300 focus:border-transparent',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
