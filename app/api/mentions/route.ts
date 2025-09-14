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
      ratings: { select: { value: true } },
      _count: { select: { ratings: true, comments: true, savedBy: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  // ProductsList/ItemCard için hafif map
  const mapped = items.map((it) => {
    // Ensure only numeric, finite values are counted for ratings
    const values = (it.ratings || []).map(r => Number(r.value)).filter(v => Number.isFinite(v));
    const ratingsCount = values.length;
    const ratingAvg = ratingsCount ? values.reduce((a, b) => a + b, 0) / ratingsCount : 0;
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