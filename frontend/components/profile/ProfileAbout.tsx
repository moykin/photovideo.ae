import {
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Aperture,
  type LucideIcon,
} from 'lucide-react';
import type { User, SocialLinks } from '@/lib/types';

interface Props {
  user: User;
}

const SOCIAL_META: { key: keyof SocialLinks; label: string; icon: LucideIcon }[] = [
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'website', label: 'Website', icon: Globe },
];

export function ProfileAbout({ user }: Props) {
  const socials = SOCIAL_META.filter((s) => user.socialLinks?.[s.key]);
  const hasContent =
    user.bio ||
    user.specializations?.length ||
    user.equipment ||
    socials.length > 0;

  if (!hasContent) return null;

  return (
    <section id="about" className="space-y-6">
      <h2 className="font-display text-2xl font-semibold text-ink">About</h2>

      {user.bio && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{user.bio}</p>
      )}

      {!!user.specializations?.length && (
        <div>
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-gold-600">
            Specializations
          </h3>
          <div className="flex flex-wrap gap-2">
            {(user.specializations as string[]).map((s) => (
              <span
                key={s}
                className="rounded-pill border border-sand-300 bg-cream-200 px-3.5 py-1.5 text-xs font-medium text-ink-500"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {user.equipment && (
        <div>
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-gold-600">
            Equipment
          </h3>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
            <Aperture className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
            {user.equipment}
          </p>
        </div>
      )}

      {socials.length > 0 && (
        <div>
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-gold-600">
            Find me online
          </h3>
          <div className="flex flex-wrap gap-2">
            {socials.map(({ key, label, icon: Icon }) => (
              <a
                key={key}
                href={user.socialLinks![key]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-pill border border-sand-300 bg-cream-50 px-3.5 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:border-gold-300 hover:text-ink"
              >
                <Icon className="h-3.5 w-3.5 text-gold-500" />
                {label}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
