// app/api/comments/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// best-effort helper to fetch BrandAccount slug via createdById
async function getBrandSlugByUserId(userId: string): Promise<string | undefined> {
  try {
    const anyPrisma: any = prisma as any;
    const brand = await anyPrisma?.brandAccount?.findFirst?.({
      where: { createdById: userId },
      select: { slug: true },
    });
    const slug = brand?.slug;
    if (typeof slug === 'string' && slug.trim().length > 0) return slug.trim();
  } catch {}
  return undefined;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const idsToDelete: string[] = Array.isArray((body as any).imagesDelete)
      ? (body as any).imagesDelete.filter((x: any) => typeof x === 'string')
      : [];
    const imagesToAdd: Array<{ url: string; width?: number; height?: number; blurDataUrl?: string }> = Array.isArray((body as any).imagesAdd)
      ? (body as any).imagesAdd.filter((x: any) => x && typeof x.url === 'string')
      : [];
    const data: any = { editedAt: new Date() };

    // metin opsiyonel
    if (typeof body.text === 'string') data.text = String(body.text);

    // rating opsiyonel ama geldiyse 1..5 olmalı
    if (body.rating !== undefined) {
      const r = Number(body.rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) {
        return NextResponse.json({ ok: false, error: 'invalid-rating' }, { status: 400 });
      }
      data.rating = Math.round(r);
    }

    // yetki kontrolü (sahibi ya da admin)
    const existing = await prisma.comment.findUnique({
      where: { id: params.id }, select: { id: true, userId: true }
    });
    if (!existing) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
    const isOwner = existing.userId === me.id;
    const isAdmin = (me as any)?.email === 'ratestuffnet@gmail.com' || (me as any)?.isAdmin === true;
    if (!isOwner && !isAdmin) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const updated = await prisma.comment.update({
      where: { id: params.id },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            maskedName: true,
            avatarUrl: true,
            email: true,
            kind: true,
          }
        }
      },
    });
    // Optionally delete requested comment images
    if (idsToDelete.length > 0) {
      await prisma.commentImage.deleteMany({
        where: { id: { in: idsToDelete }, commentId: params.id },
      });
    }
    if (imagesToAdd.length > 0) {
      const last = await prisma.commentImage.findMany({
        where: { commentId: params.id },
        select: { order: true },
        orderBy: { order: 'desc' },
        take: 1,
      });
      let base = (last[0]?.order ?? -1) + 1;
      await prisma.commentImage.createMany({
        data: imagesToAdd.map((im, idx) => ({
          commentId: params.id,
          url: im.url,
          width: im.width ?? null,
          height: im.height ?? null,
          blurDataUrl: im.blurDataUrl ?? null,
          order: base + idx,
        })),
      });
    }
    const updatedWithSlug = updated?.user
      ? { ...updated, user: { ...updated.user, slug: await getBrandSlugByUserId(updated.user.id) } }
      : updated;
    return NextResponse.json({ ok: true, comment: updatedWithSlug });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const existing = await prisma.comment.findUnique({
      where: { id: params.id }, select: { id: true, userId: true }
    });
    if (!existing) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
    const isOwner = existing.userId === me.id;
    const isAdmin = (me as any)?.email === 'ratestuffnet@gmail.com' || (me as any)?.isAdmin === true;
    if (!isOwner && !isAdmin) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    await prisma.comment.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}