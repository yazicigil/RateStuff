import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import ProductsList from "@/components/brand/ProductsList";
import { getBrandCSSVars } from "@/lib/brandTheme";

// local helpers for page tint (same logic as /brand/me)
function hexToRgbLocal(hex: string) {
  const h = hex?.replace("#", "").trim() || "ffffff";
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "f");
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function relLumaLocal({ r, g, b }: { r: number; g: number; b: number }) {
  const toLin = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = toLin(r), G = toLin(g), B = toLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// public only (no edit)
const BrandBioInline = dynamic(() => import("@/components/brand/BrandBioInline"), { ssr: false });
const SocialBar = dynamic(() => import("@/components/brand/SocialBar"), { ssr: false });
const OwnerSettings = dynamic(() => import("@/components/brand/OwnerSettings"), { ssr: false });

// verified badge – inline svg (conditional)
function VerifiedBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-[18px] h-[18px] align-middle">
      <circle cx="12" cy="12" r="9" className="fill-[#3B82F6] dark:fill-[#3B82F6]" />
      <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function BrandPublicPage({ params }: { params: { slug: string } }) {
  const { slug } = params || {};
  if (!slug) notFound();

  const session = await auth();

  // 1) brand by slug
  const brand = await prisma.brandAccount.findUnique({
    where: { slug },
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
  if (!brand) notFound();

  // 2) owner user by brand email (mirrors /brand/me data model)
  const owner = await prisma.user.findUnique({
    where: { email: brand.email! },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      kind: true,
      createdAt: true,
    },
  });
  if (!owner) notFound();

  const isOwner = Boolean((session as any)?.user?.id && (session as any).user.id === owner.id);

  // theme variables identical to /brand/me
  const brandHex = brand.cardColor ?? "#ffffff";
  const isLightBrand = (() => {
    try {
      return relLumaLocal(hexToRgbLocal(brandHex)) > 0.6;
    } catch {
      return true;
    }
  })();
  const brandRGB = hexToRgbLocal(brandHex);
  const surfaceWeak = `rgba(${brandRGB.r}, ${brandRGB.g}, ${brandRGB.b}, ${isLightBrand ? 0.08 : 0.12})`;
  const brandVars = getBrandCSSVars(brand.cardColor ?? "#ffffff");

  // items authored by the brand owner
  const items = await prisma.item.findMany({
    where: { createdById: owner.id },
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
  const itemsCount = await prisma.item.count({ where: { createdById: owner.id } });

  // average rating over comments on this owner's items
  const ratingAgg = await prisma.comment.aggregate({
    _avg: { rating: true },
    where: { item: { createdById: owner.id } },
  });
  const avgRating = ratingAgg._avg.rating;

  // per-item averages and counts (normalized for ItemCard/RatingPill)
  const itemAverages = await prisma.comment.groupBy({
    by: ["itemId"],
    _avg: { rating: true },
    where: { item: { createdById: owner.id } },
  });
  const avgMap = new Map(itemAverages.map((g) => [g.itemId, g._avg.rating ?? null]));

  const commentsCountAgg = await prisma.comment.groupBy({
    by: ["itemId"],
    _count: { _all: true },
    where: { item: { createdById: owner.id } },
  });
  const commentsCountMap = new Map(commentsCountAgg.map((g) => [g.itemId, (g as any)._count?._all ?? 0]));

  const itemsForClient = items.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description ?? "",
    imageUrl: it.imageUrl ?? null,
    productUrl: (it as any).productUrl ?? null,
    avg: avgMap.get(it.id) ?? null,
    avgRating: avgMap.get(it.id) ?? null,
    count: commentsCountMap.get(it.id) ?? 0,
    commentsCount: commentsCountMap.get(it.id) ?? 0,
    commentCount: commentsCountMap.get(it.id) ?? 0,
    ratingsCount: commentsCountMap.get(it.id) ?? 0,
    tags: Array.isArray((it as any).tags) ? (it as any).tags.map((t: any) => t?.tag?.name).filter(Boolean) : [],
    createdById: owner.id,
    createdBy: { id: owner.id, name: owner.name, maskedName: null, avatarUrl: owner.avatarUrl, kind: owner.kind },
  }));

  // trending tags scoped to this brand
  const tagFreq = new Map<string, number>();
  for (const it of itemsForClient) for (const t of it.tags as string[]) tagFreq.set(t, (tagFreq.get(t) || 0) + 1);
  const trendingTags = Array.from(tagFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name]) => name);

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
          {/* no BrandCoverEditor on public */}
        </div>

        {/* Avatar anchored to the cover bottom-left (static) */}
        <div className="absolute left-4 sm:left-6 md:left-8 bottom-0 translate-y-1/2 z-30">
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full ring-2 ring-white dark:ring-[#0b1220] overflow-hidden bg-neutral-200 dark:bg-neutral-800">
            {owner.avatarUrl ? (
              <Image src={owner.avatarUrl} alt={owner.name ?? owner.email ?? "Avatar"} fill className="object-cover" />
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-0 pb-8 sm:pb-12 -mt-4 sm:-mt-6">
        {/* Hero */}
        <div
          id="brand-hero-card"
          className="relative rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0b1220] shadow-md p-4 sm:p-6 md:p-7 pt-24 sm:pt-10 md:pt-9 pl-4 sm:pl-40 md:pl-44 -translate-y-2 sm:translate-y-0"
          style={{ color: "var(--brand-ink, inherit)", backgroundColor: "var(--brand-items-bg)", borderColor: "var(--brand-elev-bd)" }}
        >
          {/* Top row: name + badge */}
          <div className="mt-0 flex flex-col gap-2 md:pr-2">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <h1 className="text-2xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                {brand.displayName ?? owner.name ?? owner.email}
              </h1>
              <VerifiedBadge />
              {isOwner ? <OwnerSettings brandEmail={brand.email!} ownerUserId={owner.id} /> : null}
            </div>

            {/* Social links (read-only) */}
            <SocialBar userId={owner.id} className="pt-1" />

            {/* Bio (read-only) */}
            <div className="pt-2 text-[13px] sm:text-sm leading-6 max-w-prose">
              <BrandBioInline brandId={brand.id as string} initialBio={brand.bio ?? ""} />
              {brand.active === false && <p className="mt-1 text-xs text-amber-500">(pasif)</p>}
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div
              className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 border border-neutral-200/60 dark:border-white/10"
              style={{ backgroundColor: "var(--brand-chip-bg)", borderColor: "var(--brand-elev-bd)" }}
            >
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--brand-ink-subtle)" }}>
                Ürün
              </span>
              <span className="text-sm font-semibold leading-none">{itemsCount}</span>
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-neutral-200/60 dark:border-white/10"
              style={{ backgroundColor: "var(--brand-chip-bg)", borderColor: "var(--brand-elev-bd)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-500">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold leading-none">{avgRating ? avgRating.toFixed(2) : "—"}</span>
              <span className="text-[11px] leading-none" style={{ color: "var(--brand-ink-subtle)" }}>
                / 5
              </span>
            </div>
          </div>

          {/* no CardColorPicker / no CTA on public */}
        </div>

        <h2 className="mt-4 sm:mt-6 text-base sm:text-lg font-semibold tracking-tight text-neutral-700 dark:text-neutral-200">Ürünler</h2>
        <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-neutral-200/80 to-transparent dark:via-white/10" />

        {/* ProductsList (brand-themed) */}
        <div className="mt-3 sm:mt-4" style={{ color: "var(--brand-ink)" }}>
          <ProductsList
            items={itemsForClient as any}
            trending={trendingTags}
            brandTheme
            searchPlaceholder="Ürün veya açıklama ara..."
            myId={(session as any)?.user?.id ?? null}
            amAdmin={Boolean((session as any)?.user?.isAdmin || (session as any)?.user?.email === "ratestuffnet@gmail.com")}
          />
        </div>
      </div>
    </div>
  );
}