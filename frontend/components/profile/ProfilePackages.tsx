import { Lock, ArrowRight } from 'lucide-react';
import type { User } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface Props {
  user: User;
}

export interface DerivedPackage {
  name: string;
  desc: string;
  price: string;
}

/** Build display packages from the user's Strapi pricing fields. */
export function buildPackages(user: User): DerivedPackage[] {
  const packages: DerivedPackage[] = [];

  if (user.pricePerEvent) {
    packages.push({
      name: 'Full Event Coverage',
      desc: 'End-to-end coverage with edited gallery delivery',
      price: `from ${formatPrice(user.pricePerEvent, user.currency)}`,
    });
  }
  if (user.pricePerHour) {
    packages.push({
      name: 'Hourly Session',
      desc: 'Portraits, brand & lifestyle shoots, billed per hour',
      price: `${formatPrice(user.pricePerHour, user.currency)} / hr`,
    });
  }
  return packages;
}

export function ProfilePackages({ user }: Props) {
  const packages = buildPackages(user);
  if (packages.length === 0) return null;

  return (
    <section id="packages">
      <h2 className="font-display text-2xl font-semibold text-ink">Packages</h2>
      <p className="mt-1 text-sm text-ink-300">
        Choose a starting point — every booking includes a secure escrow deposit.
      </p>

      <div className="mt-4 space-y-3">
        {packages.map((p) => (
          <div
            key={p.name}
            className="group flex items-center gap-4 rounded-2xl border border-sand-300 bg-cream-50 p-4 shadow-soft transition-colors hover:border-gold-300"
          >
            <div className="flex-1">
              <h3 className="text-sm font-bold text-ink">{p.name}</h3>
              <p className="mt-0.5 text-xs text-ink-300">{p.desc}</p>
            </div>
            <span className="text-sm font-extrabold text-gold-600">{p.price}</span>
            <ArrowRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-500" />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-gold-300 bg-cream-300 px-4 py-3">
        <Lock className="h-4 w-4 shrink-0 text-gold-600" />
        <p className="text-xs font-semibold text-ink-600">
          {formatPrice(2000, user.currency)} deposit held in escrow · released to the pro after your shoot.
        </p>
      </div>
    </section>
  );
}
