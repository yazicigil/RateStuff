import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import BrandCoverEditor from "@/components/brand/BrandCoverEditor";
import dynamic from "next/dynamic";
import ItemsCardClient from '@/components/brand/ItemsCardClient';

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
    <div className="min-h-screen bg-neutral-50 dark:bg-[#111827] text-neutral-900 dark:text-neutral-100">
      {/* Inline Header */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <Link href="/brand" className="flex items-center gap-2" aria-label="RateStuff for Brands">
            {/* Public SVG logo rendered as Image; color-adapt via className */}
            <Image
              src="/forbrandslogo.svg"
              alt="RateStuff for Brands"
              priority
              className="h-8 sm:h-9 w-auto select-none text-[#011a3d] dark:invert"
            />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
          </div>
        </div>
      </div>
      {/* Cover */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative">
        <div className="relative mb-0 h-56 sm:h-64 md:h-72 lg:h-80 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-200/40 dark:bg-neutral-800/40">
          {brand?.coverImageUrl ? (
            <>
              <Image src={brand.coverImageUrl} alt="Kapak" fill className="object-cover" priority />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/0 via-black/0 to-black/10 dark:from-black/0 dark:to-black/20" />
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
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0b1220] shadow-md md:shadow-lg p-5 sm:p-7 md:p-8 pt-12 md:pt-10 pl-24 sm:pl-40 md:pl-48 relative -translate-y-2 sm:translate-y-0">
          {/* Avatar editor directly (renders avatar + edit UI) */}
          <div className="absolute -top-10 sm:-top-16 left-4 sm:left-6">
            <EditAvatar
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full ring-4 ring-white dark:ring-[#0b1220] shadow-xl"
              initialUrl={user.avatarUrl ?? null}
              name={user.name ?? user.email ?? "Brand"}
            />
          </div>

          {/* Top row: name, email, bio */}
          <div className="mt-0 flex flex-col gap-2 md:pr-2">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                {brand?.displayName ?? user.name ?? user.email}
              </h1>
              <VerifiedBadge />
            </div>

            <a href={`mailto:${user.email}`} className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 hover:underline w-fit max-w-full truncate">
              {user.email}
            </a>

            {/* Bio inline view/edit */}
            <div className="pt-1">
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

          {/* Divider */}
          <div className="my-4 sm:my-5 border-t border-neutral-200 dark:border-neutral-800" />

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 w-full">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 sm:px-5 py-3 sm:py-4 md:py-5 bg-white dark:bg-[#0b1220]">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ürün sayısı</div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold">{itemsCount}</div>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 sm:px-5 py-3 sm:py-4 md:py-5 bg-white dark:bg-[#0b1220]">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ortalama puan</div>
              <div className="mt-1 text-lg sm:text-xl md:text-2xl font-semibold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="inline-block w-5 h-5 text-yellow-500 mr-1">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {avgRating ? avgRating.toFixed(2) : "—"}
                <span className="ml-1 text-sm text-neutral-500 dark:text-neutral-400">/ 5</span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="mt-6 sm:mt-8 text-lg sm:text-xl font-semibold tracking-tight">Ürünlerim</h2>
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