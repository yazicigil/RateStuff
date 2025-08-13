// app/api/items/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { maskName } from '@/lib/mask';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_EMAIL = 'ratestuffnet@gmail.com';

function shapeItem(i: any, meId?: string | null) {
  const rrs = (i.comments || [])
    .map((c: any) => (typeof c.rating === 'number' ? c.rating : 0))
    .filter((n: number) => n > 0);
  const count = rrs.length;
  const avg = count ? rrs.reduce((a: number, n: number) => a + n, 0) / count : null;
  const my = meId ? (i.comments || []).find((c: any) => c.userId === meId) : null;
  const itemEdited = i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000;

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
    edited: !!itemEdited,
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
    comments: (i.comments || []).map((c: any) => {
      const cEdited = c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000;
      return {
        id: c.id,
        text: c.text,
        rating: (c as any)?.rating ?? null,
        edited: !!cEdited,
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
      };
    }),
    tags: (i.tags || []).map((t: any) => t.tag?.name ?? t.name).filter(Boolean),
  };
}

export async function GET(req: Request) {
  try {
    const me = await getSessionUser().catch(() => null);
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const order = url.searchParams.get('order') || 'new';

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } } },
        },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } },
      },
      orderBy: order === 'new' ? { createdAt: 'desc' } : { updatedAt: 'desc' },
      take: 100,
    });

    const shaped = items.map((it) => shapeItem(it, me?.id || null));
    return NextResponse.json(shaped);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const { name, description, imageUrl, tagsCsv } = body;
    const ratingRaw = Number(body.rating);
    const commentText = typeof body.comment === 'string' ? body.comment : '';
    const rating = Number.isFinite(ratingRaw) ? Math.round(ratingRaw) : 0;

    if (!name || typeof name !== 'string') return NextResponse.json({ ok: false, error: 'name-required' }, { status: 400 });

    const tagNames = Array.from(
      new Set(String(tagsCsv || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean))
    ).slice(0, 10);

    const resultId = await prisma.$transaction(async (tx) => {
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
        await tx.itemTag.createMany({ data: tags.map((t) => ({ itemId: item.id, tagId: t.id })), skipDuplicates: true });
      }

      if (rating >= 1 && rating <= 5) {
        await tx.comment.create({
          data: {
            itemId: item.id,
            userId: me.id,
            text: commentText || '',
            rating: rating,
          },
        });
      }

      return item.id;
    });

    return NextResponse.json({ ok: true, id: resultId }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
