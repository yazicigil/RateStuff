// app/api/mentions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/mentions?brandSlug=foo  or  ?brandId=...
 * DB mention tablosundan brandId eşleşen ve commentId IS NULL olan kayıtların itemId'leri üzerinden listeler.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandSlug = (searchParams.get("brandSlug") || "").trim();
  const brandId = (searchParams.get("brandId") || "").trim();

  if (!brandSlug && !brandId) {
    return NextResponse.json({ error: "brandSlug or brandId is required" }, { status: 400 });
  }

  // brandId geldiyse slug'a çevir
  let slug = brandSlug;
  if (!slug && brandId) {
    const ba = await prisma.brandAccount.findUnique({
      where: { id: brandId },
      select: { slug: true },
    });
    if (!ba?.slug) return NextResponse.json({ items: [] });
    slug = ba.slug;
  }

  const MAX = 500;

  // brandId’yi netle
  let brandIdResolved = brandId;
  if (!brandIdResolved) {
    const ba2 = await prisma.brandAccount.findUnique({ where: { slug }, select: { id: true } });
    brandIdResolved = ba2?.id || '';
  }
  if (!brandIdResolved) return NextResponse.json({ items: [], nextCursor: null });

  // mention tablosundan sadece commentId = null olan itemId'leri topla
  const mentionRows = await prisma.mention.findMany({
    where: { brandId: brandIdResolved, commentId: null },
    select: { itemId: true },
  });
  const itemIds = Array.from(new Set(mentionRows.map(m => m.itemId)));
  if (itemIds.length === 0) return NextResponse.json({ items: [], nextCursor: null });

  // Item'ları çek – suspended olmayanlar
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds }, suspendedAt: null },
    orderBy: { createdAt: "desc" },
    distinct: ['id'],
    take: MAX,
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      productUrl: true,
      createdAt: true,
      suspendedAt: true,
      _count: { select: { comments: true, savedBy: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  // Compute rating stats from Comment table (ratings stored on comments.rating)
  const ratingAgg = await prisma.comment.groupBy({
    by: ['itemId'],
    where: {
      itemId: { in: itemIds },
      // Avoid TS "null" typing issues: treat only positive ratings as valid
      rating: { gt: 0 },
    },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const ratingByItem = new Map<string, { avg: number; count: number }>();
  for (const row of ratingAgg) {
    const avg = Number(row._avg?.rating ?? 0);
    const count = typeof row._count === 'object' ? Number((row._count as any)._all ?? 0) : Number(row._count ?? 0);
    ratingByItem.set(String(row.itemId), {
      avg: Number.isFinite(avg) ? avg : 0,
      count: Number.isFinite(count) ? count : 0,
    });
  }

  // ProductsList/ItemCard için hafif map
  const mapped = items.map((it) => {
    const stats = ratingByItem.get(it.id) || { avg: 0, count: 0 };
    const ratingAvg = stats.avg;
    const ratingsCount = stats.count;
    return {
      id: it.id,
      name: it.name,
      desc: it.description,            // alias for ProductsList search
      description: it.description,
      imageUrl: it.imageUrl,
      productUrl: it.productUrl,
      createdAt: it.createdAt,
      suspendedAt: it.suspendedAt,
      rating: ratingAvg,               // legacy/alt field
      avgRating: ratingAvg,            // preferred by ItemCard
      avg: ratingAvg,                  // fallback alias
      ratingsAvg: ratingAvg,
      count: ratingsCount,             // ItemCard expects `count`
      ratingsCount: ratingsCount,
      totalRatings: ratingsCount,
      counts: {
        ratings: ratingsCount,
        comments: it._count.comments,
        saved: it._count.savedBy,
      },
      tags: it.tags.map((t) => t.tag.name),
    };
  });

  return NextResponse.json({ items: mapped, nextCursor: null });
}