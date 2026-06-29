'use client';

import { useEffect, useState } from 'react';
import {
  Loader2, Check, ArrowRight, ArrowLeft, User as UserIcon,
  MapPin, Tags, FileText, Wallet, Images, PartyPopper,
} from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { updateMe, strapi, getMediaUrl } from '@/lib/strapi';
import { SPECIALIZATIONS, LANGUAGES, cn, getInitials } from '@/lib/utils';
import type { User } from '@/lib/types';
import { Field, TextInput, TextArea, Select, SelectablePill } from './fields';
import { PortfolioDropzone, type LocalUpload } from './PortfolioDropzone';

const UAE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'];
const CURRENCIES = ['AED', 'USD'];

interface Package {
  id: string;
  name: string;
  price: string;
  description: string;
}

const STEPS = [
  { key: 'basics', label: 'About you', icon: UserIcon },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'categories', label: 'Specialties', icon: Tags },
  { key: 'bio', label: 'Your story', icon: FileText },
  { key: 'pricing', label: 'Rates & packages', icon: Wallet },
  { key: 'portfolio', label: 'Portfolio', icon: Images },
] as const;

export default function OnboardingWizard() {
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Dubai');
  const [country, setCountry] = useState('UAE');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [equipment, setEquipment] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [pricePerHour, setPricePerHour] = useState('');
  const [pricePerEvent, setPricePerEvent] = useState('');
  const [packages, setPackages] = useState<Package[]>([]);
  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u) {
      setDisplayName(u.displayName || '');
      setPhone(u.phone || '');
      setCity(u.city || 'Dubai');
      setCountry(u.country || 'UAE');
      setSpecializations(u.specializations || []);
      setLanguages(u.languages || []);
      setBio(u.bio || '');
      setExperience(u.experience != null ? String(u.experience) : '');
      setEquipment(u.equipment || '');
      setCurrency(u.currency || 'AED');
      setPricePerHour(u.pricePerHour != null ? String(u.pricePerHour) : '');
      setPricePerEvent(u.pricePerEvent != null ? String(u.pricePerEvent) : '');
      setInstagram(u.socialLinks?.instagram || '');
      setWebsite(u.socialLinks?.website || '');
    }
  }, []);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const addPackage = () =>
    setPackages((p) => [...p, { id: Math.random().toString(36).slice(2), name: '', price: '', description: '' }]);
  const updatePackage = (id: string, patch: Partial<Package>) =>
    setPackages((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removePackage = (id: string) => setPackages((p) => p.filter((x) => x.id !== id));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      // 1) Update profile fields (preserves existing data shape).
      const payload: Record<string, unknown> = {
        displayName,
        phone,
        city,
        country,
        specializations,
        languages,
        bio,
        experience: experience ? Number(experience) : undefined,
        equipment,
        currency,
        pricePerHour: pricePerHour ? Number(pricePerHour) : undefined,
        pricePerEvent: pricePerEvent ? Number(pricePerEvent) : undefined,
        isAvailable: true,
        socialLinks: {
          ...(user.socialLinks || {}),
          instagram,
          website,
        },
      };
      await updateMe(payload);

      // 2) Upload portfolio images (if any) and create a portfolio entry.
      if (uploads.length > 0) {
        try {
          const form = new FormData();
          uploads.forEach((u) => form.append('files', u.file));
          const uploadRes = await strapi.post('/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const mediaIds: number[] = (uploadRes.data || []).map((m: { id: number }) => m.id);
          if (mediaIds.length > 0) {
            await strapi.post('/portfolios', {
              data: {
                title: `${displayName || user.username}'s Portfolio`,
                category: specializations[0]?.toLowerCase().replace(/[^\w]/g, '_') || 'other',
                coverImage: mediaIds[0],
                media: mediaIds,
                author: user.id,
              },
            });
          }
        } catch {
          // Non-fatal: profile saved; portfolio upload can be retried later.
        }
      }

      const updated = { ...user, ...payload } as User;
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setDone(true);
    } catch {
      setError('Something went wrong saving your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const progress = done ? 100 : Math.round(((step + 1) / STEPS.length) * 100);
  const isLast = step === STEPS.length - 1;

  if (done) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold-100 text-gold-600">
          <PartyPopper className="h-9 w-9" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold text-ink">You&apos;re all set!</h1>
        <p className="mt-3 text-ink-500">
          Your professional profile is live. Clients across the UAE can now discover and book you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user.slug && (
            <a href={`/profile/${user.slug}`} className="btn-primary">
              View my profile
            </a>
          )}
          <a href="/dashboard" className="btn-secondary">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">
          Profile setup
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
          Build your pro profile
        </h1>
        <p className="mt-2 text-ink-500">
          A complete profile gets up to 5x more booking requests. Takes about 3 minutes.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-ink-300">
          <span>
            Step {step + 1} of {STEPS.length} · {STEPS[step].label}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-pill bg-cream-400">
          <div
            className="h-full rounded-pill bg-gradient-brand transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const state = i < step ? 'done' : i === step ? 'active' : 'idle';
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={cn(
                  'flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors',
                  state === 'active' && 'border-gold-500 bg-gold-50 text-gold-700',
                  state === 'done' && 'border-sand-300 bg-cream-50 text-ink cursor-pointer',
                  state === 'idle' && 'border-sand-300 bg-cream-50 text-ink-300 cursor-default',
                )}
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5 text-gold-600" /> : <Icon className="h-3.5 w-3.5" />}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card */}
      <div className="rounded-3xl border border-sand-300 bg-cream-50 p-6 shadow-card sm:p-8">
        {/* STEP 0 — Basics */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-brand">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getMediaUrl(user.avatar.url)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-bold text-cream">
                    {getInitials(displayName || user.username)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-ink">Let&apos;s start with the basics</p>
                <p className="text-sm text-ink-300">How clients will see your name and reach you.</p>
              </div>
            </div>
            <Field label="Display name" required hint="The name shown on your public profile.">
              <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Layla Hassan" />
            </Field>
            <Field label="Phone" hint="Used for booking coordination. Not shown publicly.">
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 123 4567" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Instagram">
                <TextInput value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." />
              </Field>
              <Field label="Website">
                <TextInput value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 1 — Location */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">Where do you work?</h2>
              <p className="mt-1 text-sm text-ink-300">Pick your home base — clients filter by city.</p>
            </div>
            <Field label="City" required>
              <div className="flex flex-wrap gap-2">
                {UAE_CITIES.map((c) => (
                  <SelectablePill key={c} active={city === c} onClick={() => setCity(c)}>
                    {c}
                  </SelectablePill>
                ))}
              </div>
            </Field>
            <Field label="Country">
              <TextInput value={country} onChange={(e) => setCountry(e.target.value)} placeholder="UAE" />
            </Field>
            <Field label="Languages you speak" hint="Helps clients who prefer a specific language.">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <SelectablePill key={l} active={languages.includes(l)} onClick={() => toggle(languages, setLanguages, l)}>
                    {l}
                  </SelectablePill>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* STEP 2 — Categories */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">What do you shoot?</h2>
              <p className="mt-1 text-sm text-ink-300">Choose all that apply — these are your specialties.</p>
            </div>
            <Field label="Specialties" required hint={`${specializations.length} selected`}>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((s) => (
                  <SelectablePill key={s} active={specializations.includes(s)} onClick={() => toggle(specializations, setSpecializations, s)}>
                    {s}
                  </SelectablePill>
                ))}
              </div>
            </Field>
            <Field label="Years of experience">
              <TextInput type="number" min="0" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 5" className="max-w-[160px]" />
            </Field>
            <Field label="Equipment & gear" hint="Camera bodies, lenses, lighting, drones…">
              <TextArea rows={3} value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Sony A7 IV, 24-70mm f/2.8, Profoto B10…" />
            </Field>
          </div>
        )}

        {/* STEP 3 — Bio */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">Tell your story</h2>
              <p className="mt-1 text-sm text-ink-300">A great bio builds trust. Share your style and experience.</p>
            </div>
            <Field label="Bio" required hint={`${bio.length}/1000 characters`}>
              <TextArea
                rows={7}
                maxLength={1000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="I'm a Dubai-based wedding photographer with a love for candid, editorial storytelling. Over the past 6 years I've shot 200+ weddings across the UAE…"
              />
            </Field>
          </div>
        )}

        {/* STEP 4 — Pricing & packages */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">Set your rates</h2>
              <p className="mt-1 text-sm text-ink-300">Give clients a clear starting point. You can adjust per booking.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Currency">
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label={`Day rate (${currency})`} hint="Per shooting day.">
                <TextInput type="number" min="0" value={pricePerEvent} onChange={(e) => setPricePerEvent(e.target.value)} placeholder="3500" />
              </Field>
              <Field label={`Hourly (${currency})`}>
                <TextInput type="number" min="0" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} placeholder="500" />
              </Field>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Packages</p>
                  <p className="text-xs text-ink-300">Bundle your services into clear offerings.</p>
                </div>
                <button type="button" onClick={addPackage} className="btn-secondary !px-4 !py-2 text-xs">
                  + Add package
                </button>
              </div>
              <div className="space-y-3">
                {packages.length === 0 && (
                  <p className="rounded-xl border border-dashed border-sand-400 bg-cream-200 px-4 py-6 text-center text-sm text-ink-300">
                    No packages yet — add one to showcase your offerings (optional).
                  </p>
                )}
                {packages.map((pkg) => (
                  <div key={pkg.id} className="rounded-2xl border border-sand-300 bg-cream-200 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
                      <TextInput value={pkg.name} onChange={(e) => updatePackage(pkg.id, { name: e.target.value })} placeholder="Package name (e.g. Half-day coverage)" />
                      <TextInput type="number" min="0" value={pkg.price} onChange={(e) => updatePackage(pkg.id, { price: e.target.value })} placeholder={`Price (${currency})`} />
                    </div>
                    <TextArea
                      rows={2}
                      value={pkg.description}
                      onChange={(e) => updatePackage(pkg.id, { description: e.target.value })}
                      placeholder="What's included — hours, deliverables, edited photos…"
                      className="mt-3"
                    />
                    <div className="mt-2 text-right">
                      <button type="button" onClick={() => removePackage(pkg.id)} className="text-xs font-medium text-red-500 hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Portfolio */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">Show your work</h2>
              <p className="mt-1 text-sm text-ink-300">Upload a few of your best shots — this is what wins bookings.</p>
            </div>
            <PortfolioDropzone
              files={uploads}
              onAdd={(u) => setUploads((prev) => [...prev, ...u])}
              onRemove={(id) => setUploads((prev) => prev.filter((x) => x.id !== id))}
            />
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-between border-t border-sand-300 pt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="btn-ghost inline-flex items-center gap-1.5 disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {isLast ? (
            <button type="button" onClick={handleFinish} disabled={saving} className="btn-primary inline-flex items-center gap-2">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Check className="h-4 w-4" /> Finish & publish</>
              )}
            </button>
          ) : (
            <button type="button" onClick={next} className="btn-primary inline-flex items-center gap-2">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Skip / save-and-exit */}
      {!isLast && (
        <div className="mt-4 text-center">
          <button type="button" onClick={handleFinish} disabled={saving} className="text-sm font-medium text-ink-300 hover:text-gold-600">
            Save & finish later
          </button>
        </div>
      )}
    </div>
  );
}
