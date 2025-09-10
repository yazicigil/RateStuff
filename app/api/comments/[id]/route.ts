// app/api/comments/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
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
            // brandAccount: { select: { slug: true } }, // removed
          }
        }
      },
    });

    // Attach BrandAccount.slug using e‑mail linkage (BrandAccount.email == User.email)
    try {
      const u = (updated as any).user as { email?: string | null; kind?: string | null } | undefined;
      const isBrand = (u?.kind || '').toUpperCase() === 'BRAND';
      const email = (u?.email || '').trim();
      if (isBrand && email) {
        const brand = await prisma.brandAccount.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { slug: true },
        });
        (updated as any).user = {
          ...(updated as any).user,
          brandAccount: brand ? { slug: brand.slug } : null,
        };
      } else {
        (updated as any).user = {
          ...(updated as any).user,
          brandAccount: null,
        };
      }
    } catch {
      // ignore if brand account is not found or table not present
    }

    return NextResponse.json({ ok: true, comment: updated });
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