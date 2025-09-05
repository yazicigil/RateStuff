import Image from "next/image";
import { notFound } from "next/navigation";
import SocialBar from "@/components/brand/SocialBar"; // mevcutsa
import dynamic from "next/dynamic";
import { getBrandPublicView } from "@/lib/brand";

// --- brand theme helpers (local-only) ---
function hexToRgb(hex: string) {
  const h = hex.replace('#','').trim();
  const v = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h.padEnd(6, '0');
  const num = parseInt(v, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function luminance({r,g,b}:{r:number;g:number;b:number}) {
  const srgb = [r,g,b].map(v => {
    const s = v/255;
    return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4);
  });
  return 0.2126*srgb[0]+0.7152*srgb[1]+0.0722*srgb[2];
}
function mix(a:number,b:number,t:number){ return a + (b-a)*t; }
function toRgbStr({r,g,b}:{r:number;g:number;b:number}) { return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`; }
function withAlpha({r,g,b}:{r:number;g:number;b:number}, alpha:number){ return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`; }
function darken({r,g,b}:{r:number;g:number;b:number}, t:number){ return { r: mix(r,0,t), g: mix(g,0,t), b: mix(b,0,t) }; }
function lighten({r,g,b}:{r:number;g:number;b:number}, t:number){ return { r: mix(r,255,t), g: mix(g,255,t), b: mix(b,255,t) }; }
function computeBrandVars(hex?: string | null) {
  if (!hex) return {};
  try {
    const rgb = hexToRgb(hex);
    const L = luminance(rgb);
    // pick high-contrast ink color
    const ink = L > 0.5 ? 'rgb(20,23,28)' : 'rgb(245,247,250)'; // dark text on light bg, or light text on dark bg
    const inkSubtle = L > 0.5 ? 'rgba(20,23,28,0.7)' : 'rgba(245,247,250,0.7)';
    // subtle surfaces/borders relative to brand color
    const elevBd = toRgbStr(darken(rgb, 0.25));
    const chipBg = withAlpha(lighten(rgb, L > 0.5 ? 0.04 : 0.18), 0.18);
    const surfaceWeak = withAlpha(rgb, 0.10);
    return {
      // consumed by the template via CSS vars
      ['--brand-items-bg' as any]: toRgbStr(rgb),
      ['--brand-elev-bd' as any]: elevBd,
      ['--brand-chip-bg' as any]: chipBg,
      ['--brand-ink' as any]: ink,
      ['--brand-ink-subtle' as any]: inkSubtle,
      ['--brand-surface-weak' as any]: surfaceWeak,
    } as React.CSSProperties;
  } catch {
    return {};
  }
}
function computeChipSoftVars(hex?: string | null) {
  if (!hex) return {} as React.CSSProperties;
  try {
    const rgb = hexToRgb(hex);
    const L = luminance(rgb);
    const ink = L > 0.5 ? 'rgb(20,23,28)' : 'rgb(245,247,250)';
    const inkSubtle = L > 0.5 ? 'rgba(20,23,28,0.7)' : 'rgba(245,247,250,0.7)';
    const elevBd = toRgbStr(darken(rgb, 0.25));
    // Unselected chips: softer bg (low alpha). Selected chips use --brand-items-bg (solid) like in /brand/me
    const chipSoft = withAlpha(lighten(rgb, L > 0.5 ? 0.06 : 0.20), 0.12);
    return {
      ['--brand-items-bg' as any]: toRgbStr(rgb),
      ['--brand-elev-bd' as any]: elevBd,
      ['--brand-chip-bg' as any]: chipSoft,
      ['--brand-elev-bg' as any]: chipSoft,
      ['--brand-ink' as any]: ink,
      ['--brand-ink-subtle' as any]: inkSubtle,
      // NOTE: we intentionally do NOT set --brand-surface-weak here
    } as React.CSSProperties;
  } catch {
    return {} as React.CSSProperties;
  }
}
function computeSurfaceWeakVars(hex?: string | null) {
  if (!hex) return {} as React.CSSProperties;
  try {
    const rgb = hexToRgb(hex);
    const surfaceWeak = withAlpha(rgb, 0.10); // subtle page tint
    return {
      ['--brand-surface-weak' as any]: surfaceWeak,
    } as React.CSSProperties;
  } catch {
    return {} as React.CSSProperties;
  }
}
// --- end brand theme helpers ---

const BrandBioInline = dynamic(() => import("@/components/brand/BrandBioInline"), { ssr: false });
const ItemsCardClient = dynamic(() => import("@/components/brand/ItemsCardClient"), { ssr: false }) as any;
const OwnerSettings = dynamic(() => import("@/components/brand/OwnerSettings"), { ssr: false });

// verified badge – me sayfasındakiyle aynı
function VerifiedBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-[18px] h-[18px] align-middle">
      <circle cx="12" cy="12" r="9" className="fill-[#3B82F6] dark:fill-[#3B82F6]" />
      <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const revalidate = 60;

export default async function BrandPublicPage({ params }: { params: { slug: string } }) {
  const data = await getBrandPublicView(params.slug);
  if (!data) notFound();

  const { brand, user, itemsForClient, itemsCount, avgRating } = data;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-[#0b1220] dark:to-[#0b1220] text-neutral-900 dark:text-neutral-100"
      style={{
        ...computeSurfaceWeakVars(brand.cardColor || undefined),
        backgroundImage:
          "linear-gradient(0deg, var(--brand-surface-weak, transparent), var(--brand-surface-weak, transparent)), linear-gradient(to bottom, var(--tw-gradient-stops))",
      }}
    >
      {/* Universal Header zaten app/layout.tsx içinde render ediliyor */}

      {/* Cover */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative">
        <div className="relative z-20 mb-0 h-40 sm:h-64 md:h-72 lg:h-80 rounded-3xl overflow-hidden shadow-md bg-neutral-200/40 dark:bg-neutral-800/40">
          {brand.coverImageUrl ? (
            <>
              <Image src={brand.coverImageUrl} alt="Kapak" fill className="object-cover" priority />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-black/0 dark:from-black/30 dark:via-black/0 dark:to-black/0" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-200 via-pink-200 to-amber-200 dark:from-indigo-900/40 dark:via-fuchsia-900/40 dark:to-amber-900/40" />
          )}
        </div>

        {/* Avatar (read-only) */}
        <div className="absolute left-4 sm:left-6 md:left-8 bottom-0 translate-y-1/2 z-30">
          <Image
            src={user.avatarUrl || "/default-avatar.png"}
            alt={`${user.name ?? brand.displayName}`}
            width={128}
            height={128}
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full ring-2 ring-white dark:ring-[#0b1220] object-cover"
          />
        </div>
      </div>

      {/* Hero */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-0 pb-8 sm:pb-12 -mt-4 sm:-mt-6">
        <div
          id="brand-hero-card"
          className="relative rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0b1220] shadow-md p-4 sm:p-6 md:p-7 pt-24 sm:pt-10 md:pt-9 pl-4 sm:pl-40 md:pl-44 -translate-y-2 sm:translate-y-0"
          style={{
            ...computeBrandVars(brand.cardColor || undefined),
            color: "var(--brand-ink, inherit)",
            backgroundColor: "var(--brand-items-bg)",
            borderColor: "var(--brand-elev-bd)",
          }}
        >
          <div className="mt-0 flex flex-col gap-2 md:pr-2">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <h1 className="text-2xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                {brand.displayName}
              </h1>
              <VerifiedBadge />
              <OwnerSettings brandEmail={brand.email} ownerUserId={user.id} />
            </div>

            {/* SocialBar read-only */}
            <SocialBar userId={user.id} canEdit={false} className="pt-1" />

            {/* Bio read-only (public: sadece bio varsa göster) */}
            { (brand.bio && brand.bio.trim().length > 0) ? (
              <div className="pt-2 text-[13px] sm:text-sm leading-6 max-w-prose">
                <BrandBioInline brandId={brand.id} initialBio={brand.bio} isOwner={false} />
              </div>
            ) : null }
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 border border-neutral-200/60 dark:border-white/10" style={{ backgroundColor: "var(--brand-chip-bg)", borderColor: "var(--brand-elev-bd)" }}>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--brand-ink-subtle)" }}>Ürün</span>
              <span className="text-sm font-semibold leading-none">{itemsCount}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-neutral-200/60 dark:border-white/10" style={{ backgroundColor: "var(--brand-chip-bg)", borderColor: "var(--brand-elev-bd)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold leading-none">{avgRating ? avgRating.toFixed(2) : "—"}</span>
              <span className="text-[11px] leading-none" style={{ color: "var(--brand-ink-subtle)" }}>/ 5</span>
            </div>
          </div>
        </div>

        <h2 className="mt-4 sm:mt-6 text-base sm:text-lg font-semibold tracking-tight text-neutral-700 dark:text-neutral-200">Ürünler</h2>
        <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-neutral-200/80 to-transparent dark:via-white/10" />

        <div className="mt-3 sm:mt-4" style={computeChipSoftVars(brand.cardColor || undefined)}>
          <ItemsCardClient
            items={itemsForClient}
            trending={[]}
            loading={false}
            myId={null}         // owner algısı oluşmasın
            amAdmin={false}     // admin aksiyonları kapanır
            hideAdd={true}
            isBrandProfile      // ItemsTab içinde brand temalı stilleri aktive et
            // ideal: mode="public" showQuickAdd={false} showOwnerActions={false}
          />
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await getBrandPublicView(params.slug);
  if (!data) return {};
  const { brand } = data;
  const title = `${brand.displayName} – RateStuff`;
  const description = brand.bio?.slice(0, 160) || `${brand.displayName} marka profili.`;
  const images = brand.coverImageUrl ? [brand.coverImageUrl] : ["/og-image.jpg"];
  return {
    title,
    description,
    alternates: { canonical: `/brand/${brand.slug}` },
    openGraph: { title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}