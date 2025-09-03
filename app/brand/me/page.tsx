// app/brand/profile/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";

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

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 ring-1 ring-neutral-200/70 dark:ring-neutral-800/70">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={user.name ?? "Brand"} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-2xl">
                    {(user.name ?? user.email ?? "B")[0]}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                    {brand?.displayName ?? user.name ?? user.email}
                  </h1>
                  <VerifiedBadge />
                </div>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                {brand?.active === false && (
                  <p className="mt-1 text-xs text-amber-500">(pasif)</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 bg-neutral-50 dark:bg-neutral-900">
                <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ürün sayısı</div>
                <div className="mt-1 text-2xl font-semibold">{itemsCount}</div>
              </div>
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 bg-neutral-50 dark:bg-neutral-900">
                <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ortalama puan</div>
                <div className="mt-1 text-2xl font-semibold">
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
                  "px-3 py-1.5 rounded-full text-sm",
                  "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                )}
              >
                Ürünlerim
              </button>
            </div>
          </div>
        </div>

        {/* Items grid */}
        <div className="mt-6 sm:mt-8">
          {items.length === 0 ? (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Henüz bir ürün eklenmemiş.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="group rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-sm transition"
                >
                  <div className="p-4">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      {new Date(it.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-base font-medium mt-1">{it.name}</div>
                    {/* Kart içinde ortalama puan varsa göster */}
                    {(it as any)?.ratingAvg || (it as any)?.avgRating || (it as any)?.averageRating ? (
                      <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                        Puan: {((it as any).ratingAvg ?? (it as any).avgRating ?? (it as any).averageRating).toFixed?.(2) ?? (it as any).ratingAvg ?? (it as any).avgRating ?? (it as any).averageRating}/5
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}