import { MetadataRoute } from 'next';

const BASE = 'https://photovideo.ae';
const STRAPI = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://api.photovideo.ae';

// Regenerate the sitemap hourly so new articles / profiles show up without a
// redeploy (ISR). Strapi fetches are best-effort — if the API is empty or down,
// we still emit the static pages and never break the build.
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

async function fetchJson(path: string): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${STRAPI}${path}`, { signal: ctrl.signal, next: { revalidate: 3600 } });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

type Item = { slug: string; updatedAt?: string };

// Works for both Strapi v5 (flat) and v4 (attributes), and users-permissions
// which returns a bare array.
function itemsFrom(json: unknown): Item[] {
  const arr = Array.isArray(json) ? json : (json as { data?: unknown[] })?.data;
  if (!Array.isArray(arr)) return [];
  const out: Item[] = [];
  for (const raw of arr) {
    const it = raw as { slug?: string; updatedAt?: string; attributes?: { slug?: string; updatedAt?: string } };
    const a = it.attributes ?? it;
    if (a?.slug) out.push({ slug: a.slug, updatedAt: a.updatedAt });
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticPages: Entry[] = [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/photographers`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/feed`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/download`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const [articlesJson, usersJson] = await Promise.all([
    fetchJson('/api/articles?fields[0]=slug&fields[1]=updatedAt&sort=updatedAt:desc&pagination[pageSize]=500'),
    fetchJson('/api/users?filters[confirmed]=true&fields[0]=slug&fields[1]=updatedAt&pagination[pageSize]=500'),
  ]);

  const articles: Entry[] = itemsFrom(articlesJson).map((a) => ({
    url: `${BASE}/blog/${a.slug}`,
    lastModified: a.updatedAt || now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const profiles: Entry[] = itemsFrom(usersJson).map((u) => ({
    url: `${BASE}/profile/${u.slug}`,
    lastModified: u.updatedAt || now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...articles, ...profiles];
}
