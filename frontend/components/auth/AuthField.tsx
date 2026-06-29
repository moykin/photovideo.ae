import { forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Optional adornment rendered on the left (e.g. an @ prefix or icon). */
  leftAdornment?: ReactNode;
  /** Optional adornment rendered on the right (e.g. show-password toggle). */
  suffix?: ReactNode;
}

/**
 * AuthField — labeled, warm-themed text input used across the auth forms.
 * Keeps markup consistent with the redesign tokens (sand borders, cream fill,
 * gold focus ring) while remaining ref-friendly for react-hook-form register().
 */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, error, leftAdornment, suffix, className, ...props }, ref) => {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-600">{label}</label>
        <div className="relative">
          {leftAdornment && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-300">
              {leftAdornment}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-xl border bg-cream-50 px-4 py-3 text-sm text-ink placeholder-ink-300',
              'outline-none transition-all duration-200 focus:ring-2 focus:ring-gold-300 focus:border-transparent',
              error ? 'border-red-300' : 'border-sand-300',
              leftAdornment ? 'pl-8' : '',
              suffix ? 'pr-11' : '',
              className,
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);
AuthField.displayName = 'AuthField';

/** AuthDivider — "or continue with email" separator using sand rules. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-sand-300" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-cream px-3 text-xs uppercase tracking-wide text-ink-300">
          {label}
        </span>
      </div>
    </div>
  );
}
