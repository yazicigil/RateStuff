import Image from "next/image";
import { notFound } from "next/navigation";
import SocialBar from "@/components/brand/SocialBar"; // mevcutsa
import dynamic from "next/dynamic";
import { getBrandPublicView } from "@/lib/brand";
import { auth } from "@/lib/auth";
import { getBrandCSSVars } from "@/lib/brandTheme";
import ProductsList from "@/components/brand/ProductsList";
import HeroBrandCard from "@/components/brand/HeroBrandCard";


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
        <HeroBrandCard
          mode="public"
          brand={brand}
          user={user}
          viewerId={viewerId}
          viewerIsAdmin={viewerIsAdmin}
          metrics={{ itemsCount, avgRating }}
        />
        <div className="mt-4 sm:mt-6">
          <BrandTabSwitch
            active={activeTab === 'mentions' ? 'mentions' : 'items'}
            color={brand.cardColor || '#000'}
          />
        </div>
        <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-neutral-200/80 to-transparent dark:via-white/10" />

        <div className="mt-3 sm:mt-4">
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