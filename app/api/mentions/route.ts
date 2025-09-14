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

  const takeParam = Number(searchParams.get("take"));
  const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 200) : 100;
  const cursor = searchParams.get("cursor") || undefined;

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
    take: take + (cursor ? 1 : 0),
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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

  // cursor hesapla
  let nextCursor: string | null = null;
  let page = items;
  if (page.length > take) {
    nextCursor = page[take - 1].id;
    page = page.slice(0, take);
  }

  // ProductsList/ItemCard için hafif map
  const mapped = page.map((it) => {
    const values = (it.ratings || []).map(r => Number(r.value) || 0);
    const ratingAvg = values.length ? values.reduce((a,b)=>a+b,0) / values.length : null;
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
      count: it._count.ratings,        // ItemCard expects `count`
      counts: {
        ratings: it._count.ratings,
        comments: it._count.comments,
        saved: it._count.savedBy,
      },
      tags: it.tags.map((t) => t.tag.name),
    };
  });

  return NextResponse.json({ items: mapped, nextCursor });
}