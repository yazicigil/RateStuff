// app/brand/me/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import BrandCoverEditor from "@/components/brand/BrandCoverEditor";
import dynamic from "next/dynamic";

const ItemsTab = dynamic(() => import('@/components/me/ItemsTab'), { ssr: false });

const BrandBioInline = dynamic(() => import("@/components/brand/BrandBioInline"), { ssr: false });

// verified badge – inline svg
function VerifiedBadge() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"
      className="inline-block ml-1 w-4 h-4 align-middle"
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

  const itemsForClient = items.map((it) => ({
    id: it.id,
    name: it.name,
    description: '',
    imageUrl: null as string | null,
    avg: avgMap.get(it.id) ?? null,
    avgRating: avgMap.get(it.id) ?? null,
    tags: [] as string[],
    createdBy: { id: user.id, name: user.name, maskedName: null, avatarUrl: user.avatarUrl, kind: user.kind },
  }));

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
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
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6 sm:p-8 pt-20 md:pt-24 pl-40 md:pl-48 relative">
          {/* Avatar inside card, overlapping like reference layout */}
          <div className="absolute -top-16 left-6 w-32 h-32 rounded-full ring-4 ring-white dark:ring-neutral-900 shadow-lg bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name ?? "Brand"} fill className="object-cover rounded-full" />
            ) : (
              <div className="w-full h-full grid place-items-center text-3xl font-semibold text-neutral-600 dark:text-neutral-400 rounded-full">
                {(user.name ?? user.email ?? "B")[0]}
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                  {brand?.displayName ?? user.name ?? user.email}
                </h1>
                <VerifiedBadge />
              </div>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{user.email}</p>
              {/* Bio inline view/edit: boşsa "Açıklama ekle", doluysa metin + küçük kalem ikonu */}
              <BrandBioInline brandId={brand?.id as string} initialBio={brand?.bio ?? ""} isOwner />
              {brand?.active === false && (
                <p className="mt-1 text-xs text-amber-500">(pasif)</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:gap-5 md:w-auto w-full md:justify-end">
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 px-5 py-4 bg-white dark:bg-neutral-900">
                <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ürün sayısı</div>
                <div className="mt-1 text-2xl font-semibold">{itemsCount}</div>
              </div>
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 px-5 py-4 bg-white dark:bg-neutral-900">
                <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ortalama puan</div>
                <div className="mt-1 text-2xl font-semibold flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="inline-block w-5 h-5 text-yellow-500 mr-1"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {avgRating ? avgRating.toFixed(2) : "—"}
                  <span className="ml-1 text-sm text-neutral-500 dark:text-neutral-400">/ 5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Single tab header */}
          <div className="mt-6 sm:mt-8 border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={clsx(
                  "px-4 py-1.5 rounded-full text-sm font-medium",
                  "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
                )}
              >
                Ürünlerim
              </button>
            </div>
          </div>
        </div>

        {/* ItemsTab client section */}
        <div className="mt-6 sm:mt-8">
          {/* ItemsTab client section */}
          {/* notify/onReload left undefined on purpose (client wrapper internal fallback) */}
          <ItemsTab
            items={itemsForClient as any}
            trending={[]}
            loading={false}
            myId={user.id}
            amAdmin={Boolean((session as any)?.user?.isAdmin)}
          />
        </div>
      </div>
    </div>
  );
}