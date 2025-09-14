// app/api/mentions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/mentions?brandSlug=foo  or  ?brandId=...
 * Optional: ?take=24&cursor=<itemId>
 * Suspended olmayan ve @slug geçen item'ları döner (item.description veya comment.text içinde).
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

  const pattern = `@${slug}`; // mention araması (case-insensitive)

  const takeParam = Number(searchParams.get("take"));
  const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 50) : 24;
  const cursor = searchParams.get("cursor") || undefined;

  const where = {
    suspendedAt: null,
    description: { contains: pattern, mode: "insensitive" as const },
  };

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + (cursor ? 1 : 0),
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      productUrl: true,
      createdAt: true,
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
  const mapped = page.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description,
    imageUrl: it.imageUrl,
    productUrl: it.productUrl,
    createdAt: it.createdAt,
    counts: {
      ratings: it._count.ratings,
      comments: it._count.comments,
      saved: it._count.savedBy,
    },
    tags: it.tags.map((t) => t.tag.name),
  }));

  return NextResponse.json({ items: mapped, nextCursor });
}