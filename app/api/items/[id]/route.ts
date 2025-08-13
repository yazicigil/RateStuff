// app/api/items/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { maskName } from '@/lib/mask';

const ADMIN_EMAIL = 'ratestuffnet@gmail.com';

function shapeItem(i: any, currentUserId?: string | null) {
  const rrs = (i.comments || [])
    .map((c: any) => (typeof c.rating === 'number' ? c.rating : 0))
    .filter((n: number) => n > 0);
  const count = rrs.length;
  const avg = count ? rrs.reduce((a: number, n: number) => a + n, 0) / count : null;
  const itemEdited = i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000;
  const myRating = currentUserId
    ? ((i.comments || []).find((c: any) => c.userId === currentUserId)?.rating ?? null)
    : null;
  return {
    id: i.id,
    name: i.name,
    description: i.description,
    imageUrl: i.imageUrl,
    avg,
    avgRating: avg,
    count,
    myRating,
    myCommentId: currentUserId ? ((i.comments || []).find((c: any) => c.userId === currentUserId)?.id ?? null) : null,
    myRatingViaComment: myRating,
    edited: !!itemEdited,
    createdBy: i.createdBy
      ? {
          id: i.createdBy.id,
          name:
            (i.createdBy as any)?.email === ADMIN_EMAIL
              ? (i.createdBy.name || 'Anonim')
              : (i.createdBy.maskedName ?? (i.createdBy.name ? maskName(i.createdBy.name) : 'Anonim')),
          avatarUrl: i.createdBy.avatarUrl ?? null,
          verified: (i.createdBy as any)?.email === ADMIN_EMAIL,
        }
      : null,
    comments: (i.comments || []).map((c: any) => {
      const cEdited = c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000;
      return {
        id: c.id,
        text: c.text,
        rating: (c as any)?.rating ?? null,
        edited: !!cEdited,
        user: {
          id: c.user?.id,
          name:
            (c.user as any)?.email === ADMIN_EMAIL
              ? (c.user?.name || 'Anonim')
              : (c.user?.maskedName ?? (c.user?.name ? maskName(c.user.name) : 'Anonim')),
          avatarUrl: c.user?.avatarUrl ?? null,
          verified: (c.user as any)?.email === ADMIN_EMAIL,
        },
      };
    }),
    tags: (i.tags || []).map((t: any) => t.tag?.name ?? t.name).filter(Boolean),
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser().catch(() => null);
    const i = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        comments: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } } } },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } },
      },
    });
    if (!i) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
    return NextResponse.json({ ok: true, item: shapeItem(i, me?.id) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const item = await prisma.item.findUnique({
      where: { id: params.id },
      select: { id: true, createdById: true },
    });
    if (!item) {
      return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
    }

    const isOwner = item.createdById === me.id;
    const isAdmin = (me as any)?.email === ADMIN_EMAIL || (me as any)?.isAdmin === true;
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany({ where: { itemId: item.id } });
      await tx.itemTag.deleteMany({ where: { itemId: item.id } });
      // Eğer başka ilişkiler varsa ve CASCADE yoksa, benzer deleteMany blokları eklenebilir.
      await tx.item.delete({ where: { id: item.id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
