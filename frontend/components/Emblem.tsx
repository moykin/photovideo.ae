export function Emblem({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" fill="none">
      <rect x="14" y="14" width="92" height="92" rx="6" stroke="currentColor" strokeWidth="6" />
      <rect x="22" y="22" width="6" height="10" fill="currentColor" />
      <rect x="92" y="22" width="6" height="10" fill="currentColor" />
      <rect x="22" y="88" width="6" height="10" fill="currentColor" />
      <rect x="92" y="88" width="6" height="10" fill="currentColor" />
      <circle cx="60" cy="60" r="14" fill="#E5392B" />
    </svg>
  );
}
