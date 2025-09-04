import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import BrandCoverEditor from "@/components/brand/BrandCoverEditor";
import dynamic from "next/dynamic";
import ItemsCardClient from '@/components/brand/ItemsCardClient';
import CardColorPicker from '@/components/brand/CardColorPicker';

const BrandBioInline = dynamic(() => import("@/components/brand/BrandBioInline"), { ssr: false });

const EditAvatar = dynamic(() => import("@/components/brand/EditAvatar"), { ssr: false });

const NotificationsDropdown = dynamic(() => import("@/components/header/notifications/Dropdown"), { ssr: false });

// verified badge – inline svg
function VerifiedBadge() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
      className="inline-block ml-1 w-5 h-5 align-middle"
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
    },
  });

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
      createdAt: true,
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
    avg: avgMap.get(it.id) ?? null,
    avgRating: avgMap.get(it.id) ?? null,
    commentsCount: commentsCountMap.get(it.id) ?? 0,
    commentCount: commentsCountMap.get(it.id) ?? 0, // alias for components expecting `commentCount`
    ratingsCount: commentsCountMap.get(it.id) ?? 0,
    tags: (it as any).tags ?? [],
    createdBy: { id: user.id, name: user.name, maskedName: null, avatarUrl: user.avatarUrl, kind: user.kind },
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-[#0b1220] dark:to-[#0b1220] text-neutral-900 dark:text-neutral-100">
      {/* Inline Header */}
      <div
        className="sticky top-0 z-20 backdrop-blur-sm border-b"
        style={{ backgroundColor: 'var(--rs-header-bg)', borderColor: 'var(--rs-header-border)' }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <Link href="/brand" className="flex items-center gap-2" aria-label="RateStuff for Brands">
              {/* Public SVG logo rendered as Image; color-adapt via className */}
              <Image
                src="/forbrandslogo.svg"
                alt="RateStuff for Brands"
                priority
                className="h-8 sm:h-9 w-auto select-none text-[#011a3d] dark:brightness-0 dark:invert"
              />
            </Link>
            <div className="flex items-center gap-2">
              <NotificationsDropdown />
            </div>
          </div>
        </div>
      </div>
      {/* Cover */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative">
        <div className="relative mb-0 h-56 sm:h-64 md:h-72 lg:h-80 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-200/40 dark:bg-neutral-800/40">
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
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-0 pb-8 sm:pb-12 -mt-4 sm:-mt-6">
        {/* Hero */}
        <div
          id="brand-hero-card"
          className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0b1220] shadow-md p-4 sm:p-6 md:p-7 pt-10 md:pt-9 pl-24 sm:pl-36 md:pl-40 relative -translate-y-1 sm:translate-y-0"
          style={{
            color: 'var(--brand-ink, inherit)',
          }}
        >
          {/* Avatar editor directly (renders avatar + edit UI) */}
          <div className="absolute -top-10 sm:-top-16 left-4 sm:left-6">
            <EditAvatar
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full ring-4 ring-white/70 dark:ring-white/10 shadow-xl"
              initialUrl={user.avatarUrl ?? null}
              name={user.name ?? user.email ?? "Brand"}
            />
          </div>

          {/* Top row: name, email, bio */}
          <div className="mt-0 flex flex-col gap-2 md:pr-2">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                {brand?.displayName ?? user.name ?? user.email}
              </h1>
              <VerifiedBadge />
            </div>

            <a href={`mailto:${user.email}`} className="text-xs sm:text-sm hover:underline w-fit max-w-full truncate" style={{ color: 'var(--brand-ink-subtle)' }}>
              {user.email}
            </a>

            {/* Bio inline view/edit */}
            <div className="pt-1 text-sm leading-6 max-w-prose">
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
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border border-neutral-200/60 dark:border-white/10" style={{ backgroundColor: 'var(--brand-chip-bg)' }}>
              <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--brand-ink-subtle)' }}>Ürün</span>
              <span className="text-sm font-semibold">{itemsCount}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border border-neutral-200/60 dark:border-white/10" style={{ backgroundColor: 'var(--brand-chip-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-500">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold">{avgRating ? avgRating.toFixed(2) : "—"}</span>
              <span className="text-xs" style={{ color: 'var(--brand-ink-subtle)' }}>/ 5</span>
            </div>
          </div>
          {/* Renk seçici */}
          <CardColorPicker initialColor={brand?.cardColor ?? null} targetId="brand-hero-card" />
        </div>

        <h2 className="mt-6 sm:mt-8 text-base sm:text-lg font-semibold tracking-tight text-neutral-700 dark:text-neutral-200">Ürünlerim</h2>
        <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-neutral-200/80 to-transparent dark:via-white/10" />
        {/* ItemsTab client section */}
        <div className="mt-4 sm:mt-5">
          <ItemsCardClient
            items={itemsForClient as any}
            trending={[]}
            loading={false}
            myId={user.id}
            amAdmin={Boolean((session as any)?.user?.isAdmin || (session as any)?.user?.email === 'ratestuffnet@gmail.com')}
          />
        </div>
      </div>
    </div>
  );
}