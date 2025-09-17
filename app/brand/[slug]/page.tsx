import Image from "next/image";
import { notFound } from "next/navigation";
import SocialBar from "@/components/brand/SocialBar"; // mevcutsa
import dynamic from "next/dynamic";
import { getBrandPublicView } from "@/lib/brand";
import { auth } from "@/lib/auth";
import { getBrandCSSVars } from "@/lib/brandTheme";
import ProductsList from "@/components/brand/ProductsList";


// local helpers for single-file contrast decision
function hexToRgbLocal(hex: string) {
  const h = hex?.replace('#','').trim() || 'ffffff';
  const v = h.length === 3 ? h.split('').map(c=>c+c).join('') : h.padEnd(6,'f');
  const n = parseInt(v, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
function relLumaLocal({r,g,b}:{r:number;g:number;b:number}) {
  const toLin = (v:number)=>{ v/=255; return v<=0.04045? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  const R = toLin(r), G = toLin(g), B = toLin(b);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}

const BrandBioInline = dynamic(() => import("@/components/brand/BrandBioInline"), { ssr: false });
const OwnerSettings = dynamic(() => import("@/components/brand/OwnerSettings"), { ssr: false });
const MentionsTab = dynamic(() => import("@/components/brand/MentionsTab"), { ssr: false });
const BrandTabSwitch = dynamic(() => import("@/components/brand/BrandTabSwitch"), { ssr: false });

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

export default async function BrandPublicPage({ params, searchParams }: { params: { slug: string }, searchParams?: { tab?: string } }) {
  const session = await auth();
  const viewerId = (session as any)?.user?.id ?? null;
  const viewerIsAdmin = Boolean((session as any)?.user?.isAdmin || (session as any)?.user?.email === 'ratestuffnet@gmail.com');
  const data = await getBrandPublicView(params.slug);
  if (!data) notFound();

  const { brand, user, itemsForClient, itemsCount, avgRating } = data;
  const brandHex = brand.cardColor || "#ffffff";
  const isLightBrand = (() => {
    try {
      return relLumaLocal(hexToRgbLocal(brandHex)) > 0.6;
    } catch {
      return true; // fallback to dark text
    }
  })();
  const heroInk = isLightBrand ? "#111" : "#fff";
  const heroSubtle = isLightBrand ? "rgba(17,17,17,.70)" : "rgba(255,255,255,.75)";
  const pillBorder = isLightBrand ? "rgba(17,17,17,.35)" : "rgba(255,255,255,.35)";
  const brandVars = getBrandCSSVars(brand.cardColor || "#ffffff");
  const brandRGB = hexToRgbLocal(brandHex);
  const surfaceWeak = `rgba(${brandRGB.r}, ${brandRGB.g}, ${brandRGB.b}, ${isLightBrand ? 0.08 : 0.12})`;
  const activeTab = (searchParams?.tab === 'mentions') ? 'mentions' : 'items';

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-[#0b1220] dark:to-[#0b1220] text-neutral-900 dark:text-neutral-100"
      style={{
        ...brandVars,
        ["--brand-surface-weak" as any]: surfaceWeak,
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
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full ring-4 ring-white dark:ring-[#0b1220] object-cover"
          />
        </div>
      </div>

      {/* Hero */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-0 pb-8 sm:pb-12 -mt-4 sm:-mt-6">
        <div
          id="brand-hero-card"
          className="brand-hero-scope relative rounded-3xl border bg-white dark:bg-[#0b1220] shadow-md p-4 sm:p-6 md:p-7 pt-24 sm:pt-10 md:pt-9 pl-4 sm:pl-40 md:pl-44 -translate-y-2 sm:translate-y-0"
          style={{
            color: heroInk,
            ["--hero-ink" as any]: heroInk,
            ["--brand-ink" as any]: heroInk,
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
              {viewerId === user.id ? (
                <span
                  className="owner-settings-scope inline-flex items-center"
                  style={{ color: "var(--hero-ink)" }}
                >
                  <OwnerSettings brandEmail={brand.email} ownerUserId={user.id} />
                </span>
              ) : null}
            </div>

            <div style={{ color: "var(--hero-ink)" }}>
              {/* SocialBar read-only */}
              <SocialBar userId={user.id} canEdit={false} className="pt-1" />
            </div>

            {/* Bio read-only (public: sadece bio varsa göster) */}
            { (brand.bio && brand.bio.trim().length > 0) ? (
              <div
                className="bio-scope pt-2 text-[13px] sm:text-sm leading-6 max-w-prose [&_*]:text-[var(--hero-ink)]"
                style={{ color: "var(--hero-ink)" }}
              >
                <BrandBioInline brandId={brand.id} initialBio={brand.bio} isOwner={false} />
              </div>
            ) : null }
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 border" style={{ backgroundColor: "transparent", borderColor: pillBorder }}>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: heroSubtle }}>Ürün</span>
              <span className="text-sm font-semibold leading-none">{itemsCount}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border" style={{ backgroundColor: "transparent", borderColor: pillBorder }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-500">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold leading-none">{avgRating ? avgRating.toFixed(2) : "—"}</span>
              <span className="text-[11px] leading-none" style={{ color: heroSubtle }}>/ 5</span>
            </div>
          </div>
        </div>
        <div className="mt-4 sm:mt-6">
          <BrandTabSwitch
            active={activeTab === 'mentions' ? 'mentions' : 'items'}
            color={brand.cardColor || '#000'}
          />
        </div>
        <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-neutral-200/80 to-transparent dark:via-white/10" />

        <div className="mt-3 sm:mt-4 brand-slug-scope" style={{ color: 'var(--brand-ink, #0b1220)' }}>
          {activeTab === 'mentions' ? (
            <MentionsTab
              brandSlug={brand.slug}
              brandTheme
              myId={viewerId}
              amAdmin={viewerIsAdmin}
              searchPlaceholder="Bahsetemelerde ara…"
            />
          ) : (
            <ProductsList
              // Owner/admin dışındakiler için suspended item'ları gizle; owner/admin için bırak
              items={(itemsForClient as any)
                .filter((it: any) => {
                  const status = (it as any)?.status ? String((it as any).status).toUpperCase() : '';
                  const hasSuspAt = (it as any).suspendedAt != null;
                  const legacySusp = (it as any).suspended === true || status === 'SUSPENDED';
                  const isSusp = hasSuspAt || legacySusp;
                  const ownerId = (it as any).createdById ?? (it as any).createdBy?.id ?? user.id;
                  if (!isSusp) return true;
                  if (!viewerId && !viewerIsAdmin) return false;
                  return viewerIsAdmin || viewerId === ownerId;
                })
                .map((it: any) => {
                  const status = (it as any)?.status ? String((it as any).status).toUpperCase() : '';
                  const hasSuspAt = (it as any).suspendedAt != null;
                  const legacySusp = (it as any).suspended === true || status === 'SUSPENDED';
                  const synthSuspendedAt = hasSuspAt ? (it as any).suspendedAt : (legacySusp ? '__legacy-suspended__' : null);

                  const avgCandidates = [ (it as any).avgRating, (it as any).avg, (it as any).rating ];
                  const avgPick = avgCandidates.find((v) => typeof v === 'number' && Number.isFinite(v));
                  const avgSafe = typeof avgPick === 'number' ? avgPick : 0;
                  const countRaw = (it as any).count ?? (it as any).counts?.ratings ?? (it as any).ratingsCount ?? 0;
                  const countSafe = Number.isFinite(Number(countRaw)) ? Number(countRaw) : 0;

                  return {
                    ...it,
                    createdById: it.createdById ?? it.createdBy?.id ?? user.id,
                    suspendedAt: synthSuspendedAt,
                    avg: typeof (it as any).avg === 'number' && Number.isFinite((it as any).avg) ? (it as any).avg : avgSafe,
                    avgRating: typeof (it as any).avgRating === 'number' && Number.isFinite((it as any).avgRating) ? (it as any).avgRating : avgSafe,
                    rating: typeof (it as any).rating === 'number' && Number.isFinite((it as any).rating) ? (it as any).rating : avgSafe,
                    count: countSafe,
                  };
                })}
              trending={[]}
              brandTheme
              myId={viewerId}
              amAdmin={viewerIsAdmin}
              ownerId={user.id}
            />
          )}
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Scope: only affect controls inside ProductsList on the slug page */
              .brand-slug-scope .rs-chip--selected,
              .brand-slug-scope .is-selected,
              .brand-slug-scope [aria-pressed="true"],
              .brand-slug-scope [data-selected="true"] {
                background: transparent !important;
                color: inherit !important;                  /* do not force; keep existing text color like /me */
                border-color: currentColor !important;      /* follow text color; consistent with /me */
                border-width: 2px !important;
              }
              /* Also enforce descendant icon/text color on selected */
              .brand-slug-scope .rs-chip--selected *,
              .brand-slug-scope .is-selected *,
              .brand-slug-scope [aria-pressed="true"] *,
              .brand-slug-scope [data-selected="true"] * {
                color: inherit !important;
              }
              /* Outline/Ghost buttons pressed */
              .brand-slug-scope .rs-btn--outline[aria-pressed="true"],
              .brand-slug-scope .rs-btn--ghost[aria-pressed="true"] {
                background: transparent !important;
                color: inherit !important;                             /* preserve original ink */
                border-color: currentColor !important;                 /* match /me behavior */
                box-shadow: 0 0 0 1px var(--brand-elev-bd, currentColor) inset !important;
              }
              /* Ensure icons follow currentColor */
              .brand-slug-scope .rs-chip--selected svg,
              .brand-slug-scope .is-selected svg,
              .brand-slug-scope [aria-pressed="true"] svg,
              .brand-slug-scope [data-selected="true"] svg {
                color: inherit !important;
              }
              .brand-slug-scope .rs-chip--selected svg [fill]:not([fill="none"]),
              .brand-slug-scope .is-selected svg [fill]:not([fill="none"]),
              .brand-slug-scope [aria-pressed="true"] svg [fill]:not([fill="none"]),
              .brand-slug-scope [data-selected="true"] svg [fill]:not([fill="none"]) {
                fill: currentColor !important;
              }
              .brand-slug-scope .rs-chip--selected svg [stroke]:not([stroke="none"]),
              .brand-slug-scope .is-selected svg [stroke]:not([stroke="none"]),
              .brand-slug-scope [aria-pressed="true"] svg [stroke]:not([stroke="none"]),
              .brand-slug-scope [data-selected="true"] svg [stroke]:not([stroke="none"]) {
                stroke: currentColor !important;
              }
              /* Ensure non-selected chips keep neutral background, not forced white */
              .brand-slug-scope .rs-chip:not(.rs-chip--selected) {
                background: var(--brand-elev-bg) !important;
                border-color: var(--brand-elev-bd, currentColor) !important;
              }
              /* Hero scope: force owner settings & bio to follow hero ink (brand contrast) */
              .brand-hero-scope .owner-settings-scope,
              .brand-hero-scope .owner-settings-scope * {
                color: var(--hero-ink) !important;
              }
              .brand-hero-scope .owner-settings-scope svg [fill]:not([fill="none"]) {
                fill: currentColor !important;
              }
              .brand-hero-scope .owner-settings-scope svg [stroke]:not([stroke="none"]) {
                stroke: currentColor !important;
              }
              .brand-hero-scope .bio-scope,
              .brand-hero-scope .bio-scope * {
                color: var(--hero-ink) !important;
              }
              .brand-hero-scope .bio-scope svg [fill]:not([fill="none"]) {
                fill: currentColor !important;
              }
              .brand-hero-scope .bio-scope svg [stroke]:not([stroke="none"]) {
                stroke: currentColor !important;
              }
            `,
          }}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await getBrandPublicView(params.slug);
  if (!data) return {};
  const { brand } = data;
  const title = `RateStuff | ${brand.displayName}`;
  const description = brand.bio?.trim() || `${brand.displayName} marka profili.`;
  const images = brand.coverImageUrl ? [brand.coverImageUrl] : ["/og-image.jpg"];
  return {
    title,
    description,
    alternates: { canonical: `/brand/${brand.slug}` },
    openGraph: { title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}