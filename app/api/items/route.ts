import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { containsBannedWord } from '@/lib/bannedWords';
import { milestone_userItemsShared } from "@/lib/milestones";
import { notifyTagPeers } from "@/lib/tagPeers";

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
    productUrl: i.productUrl ?? null,
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
          name: i.createdBy.name ?? null,              // raw name; front-end masks if needed
          maskedName: i.createdBy.maskedName ?? null,  // provide masked variant
          kind: (i.createdBy as any).kind ?? null,     // REGULAR | BRAND
          avatarUrl: i.createdBy.avatarUrl ?? null,
          verified: i.createdBy.email === ADMIN_EMAIL,
        }
      : null,
    comments: (() => {
      const enriched = (i.comments || []).map((c: any) => {
        const votes = Array.isArray((c as any).votes) ? (c as any).votes : [];
        const score = votes.reduce((sum: number, v: any) => sum + (typeof v?.value === 'number' ? v.value : 0), 0);
        const myVote = meId ? (votes.find((v: any) => v?.userId === meId)?.value ?? 0) : 0;
        return {
          createdAt: c.createdAt,
          data: {
            id: c.id,
            text: c.text,
            rating: (c as any)?.rating ?? null,
            score,
            myVote,
            edited: Boolean(c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000),
            user: c.user
              ? {
                  id: c.user.id,
                  name: c.user.name ?? null,                 // raw name
                  maskedName: c.user.maskedName ?? null,     // masked variant
                  kind: (c.user as any).kind ?? null,        // REGULAR | BRAND
                  avatarUrl: c.user.avatarUrl ?? null,
                  verified: c.user.email === ADMIN_EMAIL,
                }
              : null,
          },
        };
      });
      enriched.sort((a: any, b: any) => {
        const diff = (b.data.score ?? 0) - (a.data.score ?? 0);
        if (diff !== 0) return diff;
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at; // tie-breaker: newer first
      });
      return enriched.map((x: any) => x.data);
    })(),
    tags: (i.tags || []).map((t: any) => t.tag?.name ?? t.name).filter(Boolean),
    reportCount: i.reportCount ?? 0,
    suspended: Boolean(i.suspendedAt),
  };
}

export async function GET(req: Request) {
  try {
    const me = await getSessionUser().catch(() => null);
    const isAdmin = !!me?.isAdmin;
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const q = (url.searchParams.get('q') || '').trim();
    const order = url.searchParams.get('order') || 'new';

    const include = {
      comments: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true, kind: true } },
          votes: true,
        },
      },
      tags: { include: { tag: true } },
      createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true, kind: true } },
    } as const;

    if (id) {
      const item = await prisma.item.findUnique({ where: { id }, include });
      if (!item) return NextResponse.json([]);

      const isOwner = me && item.createdById && me.id === item.createdById;
      if (item.suspendedAt && !isOwner && !isAdmin) {
        // Askıdaki item: yalnızca sahibi veya admin görebilir
        return NextResponse.json([]);
      }

      return NextResponse.json([shapeItem(item, me?.id || null)]);
    }

    const searchCond = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    let where: any = {};
    if (isAdmin) {
      // Admin her şeyi görür
      where = { ...searchCond };
    } else if (me?.id) {
      // Normal kullanıcı: herkese açık aktif item'lar + kendi askıdakileri
      where = {
        AND: [
          searchCond,
          {
            OR: [
              { suspendedAt: null },
              { AND: [{ suspendedAt: { not: null } }, { createdById: me.id }] },
            ],
          },
        ],
      };
    } else {
      // Misafir: sadece aktif item'lar
      where = { AND: [searchCond, { suspendedAt: null }] };
    }

    const items = await prisma.item.findMany({
      where,
      include,
      orderBy: order === 'new' ? { createdAt: 'desc' } : { createdAt: 'desc' },
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
    const { name, description, imageUrl, productUrl } = body;
    const tagsCsv: string = body.tagsCsv || '';
    const ratingRaw = Number(body.rating);
    const commentText = typeof body.comment === 'string' ? body.comment : '';
    const rating = Number.isFinite(ratingRaw) ? Math.round(ratingRaw) : 0;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ ok: false, error: 'name-required' }, { status: 400 });
    }

    if (containsBannedWord(String(name))) {
      return NextResponse.json({ ok: false, error: 'banned-word-in-name' }, { status: 400 });
    }

    if (commentText && containsBannedWord(commentText)) {
      return NextResponse.json({ ok: false, error: 'banned-word-in-comment' }, { status: 400 });
    }

    const tagNames = Array.from(
      new Set(String(tagsCsv).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean))
    ).slice(0, 10);

    if (tagNames.some(tn => containsBannedWord(tn))) {
      return NextResponse.json({ ok: false, error: 'banned-word-in-tag' }, { status: 400 });
    }

    // productUrl validation and normalization
    let safeProductUrl: string | null = null;
    if (typeof productUrl === 'string' && productUrl.trim() !== '') {
      try {
        const u = new URL(productUrl.trim());
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          safeProductUrl = u.toString();
        } else {
          return NextResponse.json({ ok: false, error: 'invalid-product-url-protocol' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ ok: false, error: 'invalid-product-url' }, { status: 400 });
      }
    }

    const newId = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          name: name.trim(),
          description: typeof description === 'string' ? description.trim() : '',
          imageUrl: imageUrl || null,
          createdById: me.id,
          productUrl: safeProductUrl,
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

      if (rating >= 1 && rating <= 5) {
        await tx.comment.create({
          data: { itemId: item.id, userId: me.id, text: commentText || '', rating },
        });
      } else if (commentText) {
        await tx.comment.create({ data: { itemId: item.id, userId: me.id, text: commentText, rating: 0 } });
      }

      return item.id;
    });
    // Milestones: yeni item sonrası
    await milestone_userItemsShared(prisma, me.id);
    try {
      await notifyTagPeers(prisma, newId);
    } catch (e) {
      console.error('[notify:tag-peers]', e);
    }

    const include = {
      comments: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true, kind: true } },
          votes: true,
        },
      },
      tags: { include: { tag: true } },
      createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true, kind: true } },
    } as const;
    const createdFull = await prisma.item.findUnique({ where: { id: newId }, include });
    if (!createdFull) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 500 });
    return NextResponse.json(shapeItem(createdFull, me.id), { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}