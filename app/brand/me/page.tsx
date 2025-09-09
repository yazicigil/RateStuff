import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import BrandCoverEditor from "@/components/brand/BrandCoverEditor";
import dynamic from "next/dynamic";
import ProductsList from '@/components/brand/ProductsList';
import CardColorPicker from '@/components/brand/CardColorPicker';
import { getBrandCSSVars } from "@/lib/brandTheme";

// local helpers for page tint (same logic as /brand/[slug])
function hexToRgbLocal(hex: string) {
  const h = hex?.replace('#','').trim() || 'ffffff';
  const v = h.length === 3 ? h.split('').map(c=>c+c).join('') : h.padEnd(6,'f');
  const n = parseInt(v, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:(n)&255 };
}
function relLumaLocal({r,g,b}:{r:number;g:number;b:number}) {
  const toLin = (v:number)=>{ v/=255; return v<=0.04045? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  const R = toLin(r), G = toLin(g), B = toLin(b);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}

const BrandBioInline = dynamic(() => import("@/components/brand/BrandBioInline"), { ssr: false });

const EditAvatar = dynamic(() => import("@/components/brand/EditAvatar"), { ssr: false });

const NotificationsDropdown = dynamic(() => import("@/components/header/notifications/Dropdown"), { ssr: false });
const SocialBar = dynamic(() => import("@/components/brand/SocialBar"), { ssr: false });

// verified badge – inline svg
function VerifiedBadge() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
      className="inline-block ml-1 w-[18px] h-[18px] align-middle"
    >
      <circle cx="12" cy="12" r="9" className="fill-[#3B82F6] dark:fill-[#3B82F6]" />
      <path d="M8.5 12.5l2 2 4-4"
        fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function BrandProfilePage() {
  const session = await auth();
  if (!session?.user?.email) notFound();

  // DB'den tam kullanıcıyı al ve kind kontrolünü burada yap
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      kind: true,
    },
  });
  if (!user) notFound();
  if (user.kind !== "BRAND") {
    // regular kullanıcı yanlışlıkla geldiyse 404 ver
    notFound();
  }

  // Kullanıcının brand hesabı ve basit metrikler
  const brand = await prisma.brandAccount.findUnique({
    where: { email: user.email! },
    select: {
      id: true,
      email: true,
      displayName: true,
      active: true,
      coverImageUrl: true,
      bio: true,
      cardColor: true,
      slug: true,
    },
  });

  const brandHex = brand?.cardColor ?? "#ffffff";
  const isLightBrand = (() => {
    try { return relLumaLocal(hexToRgbLocal(brandHex)) > 0.6; } catch { return true; }
  })();
  const brandRGB = hexToRgbLocal(brandHex);
  const surfaceWeak = `rgba(${brandRGB.r}, ${brandRGB.g}, ${brandRGB.b}, ${isLightBrand ? 0.08 : 0.12})`;

  const brandVars = getBrandCSSVars(brand?.cardColor ?? "#ffffff");

  // İtem örneği: brand kullanıcının paylaştığı son 10 item
  const items = await prisma.item.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      productUrl: true,
      createdAt: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  const itemsCount = await prisma.item.count({ where: { createdById: user.id } });

  // Ortalama rating (1-5) — Comment tablosundan, bu kullanıcıya ait item'ların yorumlarına göre
  const ratingAgg = await prisma.comment.aggregate({
    _avg: { rating: true },
    where: {
      item: { createdById: user.id },
    },
  });
  const avgRating = ratingAgg._avg.rating;

  // Per-item average ratings from comments
  const itemAverages = await prisma.comment.groupBy({
    by: ['itemId'],
    _avg: { rating: true },
    where: { item: { createdById: user.id } },
  });
  const avgMap = new Map(itemAverages.map((g) => [g.itemId, g._avg.rating ?? null]));

  // Total comments per item
  const commentsCountAgg = await prisma.comment.groupBy({
    by: ['itemId'],
    _count: { _all: true },
    where: { item: { createdById: user.id } },
  });
  const commentsCountMap = new Map(
    commentsCountAgg.map((g) => [g.itemId, (g as any)._count?._all ?? 0])
  );

  const itemsForClient = items.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description ?? '',
    imageUrl: it.imageUrl ?? null,
    productUrl: (it as any).productUrl ?? null,
    avg: avgMap.get(it.id) ?? null,
    avgRating: avgMap.get(it.id) ?? null,
    // Ratings/comment count normalized for ItemCard/RatingPill
    count: commentsCountMap.get(it.id) ?? 0,
    commentsCount: commentsCountMap.get(it.id) ?? 0, // legacy alias
    commentCount: commentsCountMap.get(it.id) ?? 0,  // legacy alias for some components
    ratingsCount: commentsCountMap.get(it.id) ?? 0,  // legacy alias
    // Tags normalized to string[] (from relation)
    tags: Array.isArray((it as any).tags)
      ? ((it as any).tags.map((t: any) => t?.tag?.name).filter(Boolean))
      : [],
    createdById: user.id,
    createdBy: { id: user.id, name: user.name, maskedName: null, avatarUrl: user.avatarUrl, kind: user.kind },
  }));

  // Trending tags (brand scope): most frequent tags from this brand's items
  const tagFreq = new Map<string, number>();
  for (const it of itemsForClient) {
    for (const t of it.tags as string[]) {
      tagFreq.set(t, (tagFreq.get(t) || 0) + 1);
    }
  }
  const trendingTags = Array.from(tagFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name]) => name);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-[#0b1220] dark:to-[#0b1220] text-neutral-900 dark:text-neutral-100"
      style={{
        ...brandVars,
        ["--brand-surface-weak" as any]: surfaceWeak,
        backgroundImage: 'linear-gradient(0deg, var(--brand-surface-weak, transparent), var(--brand-surface-weak, transparent)), linear-gradient(to bottom, var(--tw-gradient-stops))'
      }}
    >
      {/* Cover */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative">
        <div className="relative z-20 mb-0 h-40 sm:h-64 md:h-72 lg:h-80 rounded-3xl overflow-hidden shadow-md bg-neutral-200/40 dark:bg-neutral-800/40">
          {brand?.coverImageUrl ? (
            <>
              <Image src={brand.coverImageUrl} alt="Kapak" fill className="object-cover" priority />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-black/0 dark:from-black/30 dark:via-black/0 dark:to-black/0" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-200 via-pink-200 to-amber-200 dark:from-indigo-900/40 dark:via-fuchsia-900/40 dark:to-amber-900/40" />
          )}
          <BrandCoverEditor
            brandId={brand?.id}
            initialCoverUrl={brand?.coverImageUrl || ""}
            recommendText="Önerilen boyut: 1600x400px (JPG/PNG, max 2MB)"
          />
        </div>
        {/* Avatar anchored to the cover bottom-left */}
        <div className="absolute left-4 sm:left-6 md:left-8 bottom-0 translate-y-1/2 z-30">
          <EditAvatar
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full ring-2 ring-white dark:ring-[#0b1220]"
            initialUrl={user.avatarUrl ?? null}
            name={user.name ?? user.email ?? "Brand"}
          />
        </div>
      </div>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-0 pb-8 sm:pb-12 -mt-4 sm:-mt-6">
        {/* Hero */}
        <div
          id="brand-hero-card"
          className="relative rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0b1220] shadow-md p-4 sm:p-6 md:p-7 pt-24 sm:pt-10 md:pt-9 pl-4 sm:pl-40 md:pl-44 -translate-y-2 sm:translate-y-0"
          style={{
            color: 'var(--brand-ink, inherit)',
            backgroundColor: 'var(--brand-items-bg)',
            borderColor: 'var(--brand-elev-bd)'
          }}
        >

          {/* Top row: name, email, bio */}
          <div className="mt-0 flex flex-col gap-2 md:pr-2">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <h1 className="text-2xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                {brand?.displayName ?? user.name ?? user.email}
              </h1>
              <VerifiedBadge />
            </div>

            <SocialBar userId={user.id} canEdit className="pt-1" />

            {/* Bio inline view/edit */}
            <div className="pt-2 text-[13px] sm:text-sm leading-6 max-w-prose">
              <BrandBioInline
                brandId={brand?.id as string}
                initialBio={brand?.bio ?? ""}
                isOwner
              />
              {brand?.active === false && (
                <p className="mt-1 text-xs text-amber-500">(pasif)</p>
              )}
            </div>
          </div>

          {/* Meta row (compact) */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 border border-neutral-200/60 dark:border-white/10" style={{ backgroundColor: 'var(--brand-chip-bg)', borderColor: 'var(--brand-elev-bd)' }}>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--brand-ink-subtle)' }}>Ürün</span>
              <span className="text-sm font-semibold leading-none">{itemsCount}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-neutral-200/60 dark:border-white/10" style={{ backgroundColor: 'var(--brand-chip-bg)', borderColor: 'var(--brand-elev-bd)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-500">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold leading-none">{avgRating ? avgRating.toFixed(2) : "—"}</span>
              <span className="text-[11px] leading-none" style={{ color: 'var(--brand-ink-subtle)' }}>/ 5</span>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <CardColorPicker initialColor={brand?.cardColor ?? null} targetId="brand-hero-card" />
          </div>
          {brand?.slug ? (
            <Link
              href={`/brand/${brand.slug}`}
              aria-label="Herkese açık profili görüntüle"
              title="Herkese açık profili görüntüle"
              className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm border transition shadow-sm"
              style={{
                borderColor: 'var(--brand-elev-bd, rgba(0,0,0,0.12))',
                backgroundColor: 'var(--brand-chip-bg, rgba(0,0,0,0.04))',
                color: 'var(--brand-ink, inherit)',
              }}
            >
              <span>Herkese açık profili gör</span>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-80"
              >
                <path d="M7 17L17 7M17 7H9M17 7v8" />
              </svg>
            </Link>
          ) : null}
        </div>

        <h2 className="mt-4 sm:mt-6 text-base sm:text-lg font-semibold tracking-tight text-neutral-700 dark:text-neutral-200">Ürünlerim</h2>
        <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-neutral-200/80 to-transparent dark:via-white/10" />
        {/* ProductsList section (brand-themed, same as slug page) */}
        <div className="mt-3 sm:mt-4" style={{ color: 'var(--brand-ink)' }}>
          <ProductsList
            items={itemsForClient as any}
            trending={trendingTags}
            brandTheme
            searchPlaceholder="Ürün veya açıklama ara..."
            myId={user.id}
            amAdmin={Boolean((session as any)?.user?.isAdmin || (session as any)?.user?.email === 'ratestuffnet@gmail.com')}
          />
        </div>
      </div>
    </div>
  );
}