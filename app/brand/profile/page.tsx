// app/brand/profile/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="flex items-start gap-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name ?? "Brand"} fill className="object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-xl">
                {(user.name ?? user.email ?? "B")[0]}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-semibold">
              {brand?.displayName ?? user.name ?? user.email}
              <VerifiedBadge />
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {user.email}
              {brand?.active === false && (
                <span className="ml-2 text-amber-500">(pasif)</span>
              )}
            </p>

            <div className="mt-4 flex gap-4 text-sm">
              <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                Paylaşılan içerik: <b>{itemsCount}</b>
              </span>
              {/* Örn. başka metrikler eklenebilir */}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin/brands"
              className="hidden md:inline-flex h-9 items-center rounded-md border border-neutral-300 dark:border-neutral-700 px-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              Marka ayarları
            </Link>
          </div>
        </div>

        {/* Items */}
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-3">Son paylaşımlar</h2>

          {items.length === 0 ? (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Henüz bir paylaşım yok.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((it) => (
                // Eğer sizde ItemCard varsa onu kullanın:
                // <ItemCard key={it.id} item={it} showVerifiedBadge />
                <div key={it.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    {new Date(it.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-base font-medium mt-1">{it.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}