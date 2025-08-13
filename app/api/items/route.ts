// app/api/items/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST: create a new comment for an existing item (rating required, text optional)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const ratingRaw = Number(body.rating);
    const textRaw = typeof body.comment === "string" ? body.comment : (typeof body.text === "string" ? body.text : "");
    const text = String(textRaw || "").trim();
    const rating = Number.isFinite(ratingRaw) ? Math.round(ratingRaw) : 0;

    // rating zorunlu (1..5)
    if (!(rating >= 1 && rating <= 5)) {
      return NextResponse.json({ ok: false, error: "rating-required" }, { status: 400 });
    }

    // Item var mı?
    const item = await prisma.item.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!item) {
      return NextResponse.json({ ok: false, error: "item-not-found" }, { status: 404 });
    }

    // tek yorum kuralı: aynı item + aynı user için zaten yorum varsa 409
    const existing = await prisma.comment.findFirst({
      where: { itemId: params.id, userId: me.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }

    const created = await prisma.comment.create({
      data: {
        itemId: params.id,
        userId: me.id,
        text,
        rating,
      },
      include: {
        user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, comment: created }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // unique violation (itemId,userId)
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}

// app/api/items/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { maskName } from '@/lib/mask';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_EMAIL = 'ratestuffnet@gmail.com';

function shapeItem(i: any, meId?: string | null) {
  const ratings = (i.comments || [])
    .map((c: any) => (typeof c.rating === 'number' ? c.rating : 0))
    .filter((n: number) => n > 0);
  const count = ratings.length;
  const avg = count ? ratings.reduce((a: number, n: number) => a + n, 0) / count : null;
  const my = meId ? (i.comments || []).find((c: any) => c.userId === meId) : null;

  return {
    id: i.id,
    name: i.name,
    description: i.description,
    imageUrl: i.imageUrl,
    avg,
    avgRating: avg,
    count,
    myRating: my?.rating ?? null,
    myCommentId: my?.id ?? null,
    myRatingViaComment: my?.rating ?? null,
    edited: Boolean(i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000),
    createdBy: i.createdBy
      ? {
          id: i.createdBy.id,
          name:
            i.createdBy.email === ADMIN_EMAIL
              ? i.createdBy.name || 'Anonim'
              : i.createdBy.maskedName ?? (i.createdBy.name ? maskName(i.createdBy.name) : 'Anonim'),
          avatarUrl: i.createdBy.avatarUrl ?? null,
          verified: i.createdBy.email === ADMIN_EMAIL,
        }
      : null,
    comments: (i.comments || []).map((c: any) => ({
      id: c.id,
      text: c.text,
      rating: (c as any)?.rating ?? null,
      edited: Boolean(c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000),
      user: c.user
        ? {
            id: c.user.id,
            name:
              c.user.email === ADMIN_EMAIL
                ? c.user.name || 'Anonim'
                : c.user.maskedName ?? (c.user.name ? maskName(c.user.name) : 'Anonim'),
            avatarUrl: c.user.avatarUrl ?? null,
            verified: c.user.email === ADMIN_EMAIL,
          }
        : null,
    })),
    tags: (i.tags || []).map((t: any) => t.tag?.name ?? t.name).filter(Boolean),
    reportCount: i.reportCount ?? 0,
  };
}

export async function GET(req: Request) {
  try {
    const me = await getSessionUser().catch(() => null);
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const q = (url.searchParams.get('q') || '').trim();
    const order = url.searchParams.get('order') || 'new';

    const include = {
      comments: {
        orderBy: { createdAt: 'desc' as const },
        include: { user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } } },
      },
      tags: { include: { tag: true } },
      createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } },
    } as const;

    if (id) {
      const item = await prisma.item.findUnique({ where: { id }, include });
      if (!item) return NextResponse.json([]); // frontend bu formata alışık
      return NextResponse.json([shapeItem(item, me?.id || null)]);
    }

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include,
      // Bazı şemalarda updatedAt olmayabiliyor; güvenli tarafta kalalım.
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(items.map((it) => shapeItem(it, me?.id || null)));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const { name, description, imageUrl } = body;
    const tagsCsv: string = body.tagsCsv || '';
    const ratingRaw = Number(body.rating);
    const commentText = typeof body.comment === 'string' ? body.comment : '';
    const rating = Number.isFinite(ratingRaw) ? Math.round(ratingRaw) : 0;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ ok: false, error: 'name-required' }, { status: 400 });
    }

    const tagNames = Array.from(
      new Set(String(tagsCsv).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean))
    ).slice(0, 10);

    const newId = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          name: name.trim(),
          description: typeof description === 'string' ? description.trim() : '',
          imageUrl: imageUrl || null,
          createdById: me.id,
        },
      });

      if (tagNames.length) {
        const tags = await Promise.all(
          tagNames.map((n: string) => tx.tag.upsert({ where: { name: n }, create: { name: n }, update: {} }))
        );
        await tx.itemTag.createMany({
          data: tags.map((t) => ({ itemId: item.id, tagId: t.id })),
          skipDuplicates: true,
        });
      }

      // Yeni akış: rating varsa ilk yorumu oluştur (text opsiyonel)
      if (rating >= 1 && rating <= 5) {
        await tx.comment.create({
          data: { itemId: item.id, userId: me.id, text: commentText || '', rating },
        });
      } else if (commentText) {
        // Sadece yorum geldiyse (rating yoksa) yine yorum oluştur (opsiyonel kural)
        await tx.comment.create({ data: { itemId: item.id, userId: me.id, text: commentText, rating: 0 } });
      }

      return item.id;
    });

    return NextResponse.json({ ok: true, id: newId }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}