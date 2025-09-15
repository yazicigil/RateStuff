// app/api/mentions/hide/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function POST(req: Request) {
  const session = await getServerSession(); // projendeki auth helper'a göre uyarlayın
  const me = session?.user;

  const dbUser = me?.email
    ? await prisma.user.findUnique({
        where: { email: me.email as string },
        select: { id: true, email: true, isAdmin: true },
      })
    : null;

  if (!me || !dbUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { brandId, brandSlug, itemId } = await req.json();
  if (!itemId || (!brandId && !brandSlug)) {
    return NextResponse.json({ error: 'itemId and brandId/brandSlug required' }, { status: 400 });
  }

  // brandId resolve + yetki
  const brand = await prisma.brandAccount.findUnique({
    where: brandId ? { id: brandId } : { slug: brandSlug },
    select: { id: true, createdById: true, email: true },
  });
  if (!brand) return NextResponse.json({ error: 'brand not found' }, { status: 404 });

  const amAdmin = Boolean(dbUser?.isAdmin || (session as any)?.user?.isAdmin);
  const isOwnerByCreator = brand.createdById ? brand.createdById === dbUser.id : false;
  const isOwnerByEmail = brand.email ? brand.email === dbUser.email : false;
  if (!amAdmin && !isOwnerByCreator && !isOwnerByEmail) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const res = await prisma.mention.updateMany({
    where: { brandId: brand.id, itemId, commentId: null },
    data: { hiddenAt: new Date(), hiddenById: dbUser.id },
  });

  return NextResponse.json({ ok: true, updated: res.count });
}