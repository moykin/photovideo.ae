import { MapPin, Camera, Search } from 'lucide-react';

const stats = [
  { value: '2,400+', label: 'verified pros' },
  { value: '18,000', label: 'shoots booked' },
  { value: '★ 4.9', label: 'avg rating' },
];

const collage = [
  { seed: 'pvhero1', tall: true },
  { seed: 'pvhero2', tall: false },
  { seed: 'pvhero3', tall: false },
];

export function Hero() {
  return (
    <section className="mx-auto flex max-w-7xl flex-wrap items-center gap-8 px-4 py-10 sm:px-6 lg:gap-14 lg:py-16">
      {/* Copy + search */}
      <div className="min-w-0 flex-1 basis-[420px]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-600">
          UAE · Photo &amp; Video Marketplace
        </p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.02] text-ink-900 sm:text-6xl lg:text-7xl">
          Book the Emirates&apos; finest photo &amp; video pros.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-600">
          Browse real portfolios, check live availability and book in minutes — then rent the gear
          to match. Built for clients and creators across Dubai, Abu Dhabi &amp; beyond.
        </p>

        {/* Search bar */}
        <form
          action="/photographers"
          className="mt-7 flex max-w-xl flex-wrap gap-2 rounded-[18px] border border-sand-300 bg-white p-2 shadow-soft"
        >
          <label className="flex flex-1 basis-[150px] items-center gap-2 rounded-xl bg-cream px-3.5 py-2.5">
            <MapPin className="h-5 w-5 shrink-0 text-gold-500" />
            <input
              name="city"
              defaultValue=""
              placeholder="Dubai"
              className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-ink-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-1 basis-[150px] items-center gap-2 rounded-xl bg-cream px-3.5 py-2.5">
            <Camera className="h-5 w-5 shrink-0 text-gold-500" />
            <input
              name="q"
              defaultValue=""
              placeholder="Wedding photographer"
              className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-ink-400 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-gold-600"
          >
            <Search className="h-5 w-5" />
            Search
          </button>
        </form>

        {/* Stats */}
        <div className="mt-7 flex flex-wrap gap-7">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-extrabold text-ink-900">
                {value.startsWith('★') ? (
                  <>
                    <span className="text-gold-500">★</span> {value.slice(1).trim()}
                  </>
                ) : (
                  value
                )}
              </div>
              <div className="text-xs font-semibold text-ink-300">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Collage */}
      <div className="grid min-h-[320px] min-w-0 flex-1 basis-[360px] grid-cols-2 grid-rows-2 gap-3 lg:min-h-[440px]">
        {collage.map(({ seed, tall }) => (
          <div
            key={seed}
            className={`overflow-hidden rounded-[22px] bg-gradient-to-br from-cream-400 to-gold-300 ${
              tall ? 'row-span-2' : ''
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://picsum.photos/seed/${seed}/${tall ? '500/760' : '420/360'}`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
