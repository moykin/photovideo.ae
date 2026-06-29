import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { getMediaUrl } from '@/lib/strapi';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  /** rounded-full (default) or rounded-2xl square avatar */
  square?: boolean;
  ring?: boolean;
}

export function Avatar({ src, name, size = 40, className, square = false, ring = false }: AvatarProps) {
  const radius = square ? 'rounded-2xl' : 'rounded-full';
  const resolved = src ? getMediaUrl(src) : null;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-brand text-cream font-semibold shrink-0',
        radius,
        ring && 'ring-2 ring-cream shadow-soft',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.4) }}
    >
      {resolved ? (
        <Image src={resolved} alt={name || 'avatar'} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
