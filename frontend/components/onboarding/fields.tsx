import { cn } from '@/lib/utils';

/** Labelled field wrapper with optional hint. */
export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-gold-600">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-300">{hint}</p>}
    </div>
  );
}

const fieldBase =
  'w-full rounded-xl border border-sand-300 bg-cream-50 px-4 py-3 text-sm text-ink ' +
  'placeholder-ink-300 outline-none transition-all duration-200 ' +
  'focus:ring-2 focus:ring-gold-300 focus:border-transparent';

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(fieldBase, className)} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn(fieldBase, 'resize-none leading-relaxed', className)} />;
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={cn(fieldBase, 'appearance-none cursor-pointer', className)}>
      {children}
    </select>
  );
}

/** Toggleable pill used for selecting categories / languages. */
export function SelectablePill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-pill border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95',
        active
          ? 'border-gold-500 bg-gold-500 text-cream shadow-gold'
          : 'border-sand-300 bg-cream-50 text-ink-500 hover:border-gold-300 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
