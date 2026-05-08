import type { Metadata } from 'next';
import Link from 'next/link';
import { Camera, Video, Star, ArrowRight, Shield, Zap, Globe, Sparkles, Users } from 'lucide-react';
import { getPhotographers, getPortfolios, getFeedPosts, getArticles, getFeaturedCreators } from '@/lib/strapi';
import { PhotographerCard } from '@/components/photographers/PhotographerCard';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { FeaturedCreatorCard } from '@/components/photographers/FeaturedCreatorCard';
import { FeedMasonryCard } from '@/components/feed/FeedMasonryCard';
import { ArticleCard } from '@/components/articles/ArticleCard';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'PhotoVideo.ae — Book Photographers & Videographers in UAE',
};

async function getData() {
  const [photographers, featuredCreators, portfolios, feedPosts, articles] = await Promise.all([
    getPhotographers({ 'pagination[pageSize]': 6 }).catch(() => ({ data: [] })),
    getFeaturedCreators(4).catch(() => [] as import('@/lib/types').User[]),
    getPortfolios({ 'filters[isFeatured]': true, 'pagination[pageSize]': 8 }).catch(() => ({ data: [] })),
    getFeedPosts({ 'pagination[pageSize]': 9 }).catch(() => ({ data: [] })),
    getArticles({ 'pagination[pageSize]': 3 }).catch(() => ({ data: [] })),
  ]);
  return { photographers, featuredCreators, portfolios, feedPosts, articles };
}

export default async function HomePage() {
  const { photographers, featuredCreators, portfolios, feedPosts, articles } = await getData();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-dark min-h-[85vh] flex items-center">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(192, 68, 240, 0.4) 0%, transparent 70%)',
          }}
        />
        <div className="relative container mx-auto max-w-7xl px-4 sm:px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300 mb-8">
            <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
            UAE&apos;s Creative Marketplace
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Capture Every<br />
            <span className="gradient-text">Perfect Moment</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10">
            Discover elite photographers and videographers in Dubai, Abu Dhabi, and across the UAE.
            Book in minutes. Create memories forever.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/photographers" className="btn-primary text-base px-8 py-4">
              <Camera className="h-5 w-5" />
              Find Photographers
            </Link>
            <Link href="/auth/register?type=photographer" className="btn-secondary text-base px-8 py-4 border-gray-700 bg-gray-900 text-white hover:bg-gray-800">
              <Video className="h-5 w-5" />
              Join as Creator
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { value: '500+', label: 'Verified Creators' },
              { value: '10K+', label: 'Happy Clients' },
              { value: '50K+', label: 'Portfolio Works' },
              { value: '4.9★', label: 'Average Rating' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-white">{value}</span>
                <span className="text-sm text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Creators (платное промо-размещение) ────────────────── */}
      {featuredCreators.length > 0 && (
        <section className="py-20 px-4 sm:px-6 bg-gray-950">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-end justify-between mb-10">
              <div>
                {/* Метка секции */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-gold-500/20 border border-gold-500/30 px-3 py-1 text-xs font-bold text-gold-400">
                    <Sparkles className="h-3 w-3" /> Featured
                  </span>
                </div>
                <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                  Top Creators This Month
                </h2>
                <p className="text-gray-400 mt-1 text-sm max-w-md">
                  Hand-picked photographers &amp; videographers available for booking right now
                </p>
              </div>
              {/* CTA для покупки слота */}
              <Link
                href="/advertise"
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-sm font-semibold text-gold-400 hover:bg-gold-500/20 transition-colors"
              >
                <Sparkles className="h-4 w-4" /> Get Featured
              </Link>
            </div>

            {/* Grid 4 карточки, 2 колонки на мобайле */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredCreators.map((creator) => (
                <FeaturedCreatorCard key={creator.id} creator={creator} />
              ))}
            </div>

            {/* Мобильная CTA */}
            <div className="mt-8 text-center sm:hidden">
              <Link href="/advertise" className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400">
                <Sparkles className="h-4 w-4" /> Want to be featured? Learn more
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Photographers ─────────────────────────────────────────── */}
      {photographers.data.length > 0 && (
        <section className="py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-sm font-semibold text-brand-500 uppercase tracking-wider mb-2">Top Talent</p>
                <h2 className="section-heading">Featured Photographers</h2>
              </div>
              <Link href="/photographers" className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {photographers.data.map((p) => (
                <PhotographerCard key={p.id} user={p} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link href="/photographers" className="btn-secondary">
                View all photographers <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Portfolio Showcase */}
      {portfolios.data.length > 0 && (
        <section className="py-20 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-sm font-semibold text-brand-500 uppercase tracking-wider mb-2">Inspiration</p>
                <h2 className="section-heading">Portfolio Showcase</h2>
              </div>
              <Link href="/feed" className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600">
                Explore feed <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <PortfolioGrid portfolios={portfolios.data} />
          </div>
        </section>
      )}

      {/* Why Us */}
      <section className="py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-brand-500 uppercase tracking-wider mb-2">Why PhotoVideo.ae</p>
            <h2 className="section-heading">The Smart Way to Book</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Verified Professionals',
                desc: 'Every photographer and videographer is reviewed and verified for quality and professionalism.',
              },
              {
                icon: Zap,
                title: 'Instant Booking',
                desc: 'See availability, send a request, and confirm in minutes — no back-and-forth emails.',
              },
              {
                icon: Star,
                title: 'Reviewed & Rated',
                desc: 'Real reviews from real clients. Make confident decisions with transparent ratings.',
              },
              {
                icon: Globe,
                title: 'UAE-Wide Coverage',
                desc: 'From Dubai to Abu Dhabi, Sharjah to Ras Al Khaimah — creators everywhere.',
              },
              {
                icon: Camera,
                title: 'All Specializations',
                desc: 'Wedding, commercial, portrait, fashion, real estate, events — every style covered.',
              },
              {
                icon: Video,
                title: 'Photo & Video',
                desc: 'Book photographers, videographers, or both for your project in a single booking.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 mb-4">
                  <Icon className="h-6 w-6 text-brand-500" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community Feed (masonry) ───────────────────────────────────────── */}
      {feedPosts.data.length > 0 && (
        <section className="py-20 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-brand-500" />
                  <p className="text-sm font-semibold text-brand-500 uppercase tracking-wider">Community</p>
                </div>
                <h2 className="section-heading">Creative Feed</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  Latest work from photographers &amp; videographers across the UAE
                </p>
              </div>
              <Link href="/feed" className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600">
                See all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Masonry grid — 2 колонки на mobile, 3 на md, 4 на xl */}
            <div
              className="columns-2 md:columns-3 xl:columns-4 gap-4"
              style={{ columnGap: '1rem' }}
            >
              {feedPosts.data.map((post) => (
                <FeedMasonryCard key={post.id} post={post} />
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href="/feed" className="btn-secondary inline-flex items-center gap-2">
                <Users className="h-4 w-4" /> See all community posts <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Blog */}
      {articles.data.length > 0 && (
        <section className="py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-sm font-semibold text-brand-500 uppercase tracking-wider mb-2">Knowledge</p>
                <h2 className="section-heading">Latest Articles</h2>
              </div>
              <Link href="/blog" className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-500">
                All articles <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {articles.data.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-3xl bg-gradient-brand p-12 text-center text-white">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Ready to showcase your work?
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              Join hundreds of photographers and videographers who are growing their business on PhotoVideo.ae.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register?type=photographer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-brand-600 px-8 py-3.5 font-semibold hover:bg-gray-100 transition-colors">
                <Camera className="h-5 w-5" /> Create Your Profile
              </Link>
              <Link href="/photographers" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 font-semibold hover:bg-white/20 transition-colors">
                Browse Talent
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
