import { prisma } from "@/lib/prisma";

export async function getBrandPublicView(slug: string) {
  const brand = await prisma.brandAccount.findUnique({
    where: { slug },
    select: {
      id: true, email: true, slug: true, displayName: true, active: true,
      coverImageUrl: true, bio: true, cardColor: true,
    },
  });
  if (!brand || brand.active === false) return null;

  // Brand owner user by email (me sayfasında da email ile ilişki var)
  const user = await prisma.user.findUnique({
    where: { email: brand.email },
    select: { id: true, name: true, email: true, avatarUrl: true, isAdmin: true, /* verified? eklemek istersen buraya */ },
  });
  if (!user) return null;

  // Items
  const items = await prisma.item.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
    take: 20, // istersen sayfalama ekleriz
    select: {
      id: true, name: true, description: true, imageUrl: true, productUrl: true, createdAt: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  const itemsCount = await prisma.item.count({ where: { createdById: user.id } });

  const ratingAgg = await prisma.comment.aggregate({
    _avg: { rating: true },
    where: { item: { createdById: user.id } },
  });
  const avgRating = ratingAgg._avg.rating;

  const perItemAvg = await prisma.comment.groupBy({
    by: ["itemId"],
    _avg: { rating: true },
    where: { item: { createdById: user.id } },
  });
  const avgMap = new Map(perItemAvg.map((g) => [g.itemId, g._avg.rating ?? null]));

  const perItemCounts = await prisma.comment.groupBy({
    by: ["itemId"],
    _count: { _all: true },
    where: { item: { createdById: user.id } },
  });
  const countMap = new Map(perItemCounts.map((g: any) => [g.itemId, g._count?._all ?? 0]));

  const itemsForClient = items.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description ?? "",
    imageUrl: it.imageUrl ?? null,
    productUrl: (it as any).productUrl ?? null,
    avg: avgMap.get(it.id) ?? null,
    avgRating: avgMap.get(it.id) ?? null,
    count: countMap.get(it.id) ?? 0,
    commentsCount: countMap.get(it.id) ?? 0,
    commentCount: countMap.get(it.id) ?? 0,
    ratingsCount: countMap.get(it.id) ?? 0,
    tags: Array.isArray((it as any).tags)
      ? ((it as any).tags.map((t: any) => t?.tag?.name).filter(Boolean))
      : [],
    createdBy: { id: user.id, name: user.name, maskedName: null, avatarUrl: user.avatarUrl, kind: "BRAND" as const },
  }));

  return { brand, user, itemsForClient, itemsCount, avgRating };
}