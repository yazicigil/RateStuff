// app/api/items/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { maskName } from '@/lib/mask';
import { handleMentionsOnPost } from "@/lib/mention-notify";

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
    productUrl: i.productUrl ?? null,
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
          kind: (i.createdBy as any)?.kind ?? null,
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
        comments: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true, kind: true } } } },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true, kind: true } },
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const { name, description, imageUrl, productUrl } = body || {};

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

    // productUrl normalization (same logic as POST, simplified)
    let safeProductUrl: string | null | undefined = undefined; // undefined → do not change
    if (typeof productUrl === 'string') {
      if (productUrl.trim() === '') {
        safeProductUrl = null;
      } else {
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
    }

    const data: any = {};
    if (typeof name === 'string') data.name = name.trim();
    if (typeof description === 'string') data.description = description.trim();
    if (typeof imageUrl === 'string') data.imageUrl = imageUrl.trim() || null;
    if (safeProductUrl !== undefined) data.productUrl = safeProductUrl;

    await prisma.item.update({ where: { id: params.id }, data });

    // Mentions: description güncellendiyse mention kayıtlarını upsert et
    try {
      if (typeof description === 'string') {
        await prisma.$transaction(async (tx) => {
          await handleMentionsOnPost(tx, {
            actorId: me.id,
            itemId: params.id,
            description: String(description),
          });
        });
      }
    } catch (err) {
      console.error('[mentions:on-post:update]', err);
    }

    // Return updated shaped item
    const updated = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        comments: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true, kind: true } } } },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true, kind: true } },
      },
    });
    if (!updated) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
    const meMaybe = await getSessionUser().catch(() => null);
    return NextResponse.json({ ok: true, item: shapeItem(updated as any, meMaybe?.id || null) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
