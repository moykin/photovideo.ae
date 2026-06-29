import Link from 'next/link';

export function CreatorCTA() {
  return (
    <section className="mx-auto my-8 max-w-7xl px-4 sm:px-6 lg:my-12">
      <div className="relative flex flex-wrap items-center gap-6 overflow-hidden rounded-[26px] bg-gradient-to-br from-ink to-ink-700 p-8 lg:p-12">
        {/* glow */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(216,185,120,.32), transparent 70%)',
          }}
        />
        <div className="relative flex-1 basis-[380px]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-300">
            For creators
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Turn your work into bookings.
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-cream-300/90">
            Build a portfolio page, set your packages &amp; availability, rent out your gear, and get
            discovered by businesses across the UAE.
          </p>
        </div>
        <div className="relative flex shrink-0 flex-wrap gap-3">
          <Link
            href="/auth/register?type=photographer"
            className="rounded-xl bg-gold-500 px-6 py-3.5 text-sm font-bold text-white shadow-gold transition-colors hover:bg-gold-600"
          >
            Build your portfolio
          </Link>
          <Link
            href="/photographers"
            className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-cream-200 transition-colors hover:bg-white/20"
          >
            List your gear
          </Link>
        </div>
      </div>
    </section>
  );
}
