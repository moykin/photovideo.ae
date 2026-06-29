import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-gold-500 text-cream shadow-gold hover:bg-gold-600',
  secondary: 'bg-cream-50 text-ink border border-sand-300 hover:bg-cream-300',
  ghost: 'bg-transparent text-ink-500 hover:bg-cream-300 hover:text-ink',
  dark: 'bg-ink text-cream hover:bg-ink-700',
  outline: 'bg-transparent text-ink border border-sand-400 hover:border-gold-400 hover:text-gold-600',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', pill = true, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
          'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          pill ? 'rounded-pill' : 'rounded-xl',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
