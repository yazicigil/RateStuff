
// app/api/items/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

const ADMIN_EMAIL = 'ratestuffnet@gmail.com';
async function isAdmin(me: any) {
  if (!me) return false;
  if (me.email) return me.email === ADMIN_EMAIL;
  try {
    const u = await prisma.user.findUnique({ where: { id: me.id }, select: { email: true } });
    return (u?.email || '') === ADMIN_EMAIL;
  } catch { return false; }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  if (!(await isAdmin(me))) return NextResponse.json({ ok:false, error:'forbidden' }, { status: 403 });

  const { name, description, imageUrl, tagsCsv } = await req.json().catch(() => ({}));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.item.update({
        where: { id: params.id },
        data: {
          ...(typeof name === 'string' ? { name: name.trim() } : {}),
          ...(typeof description === 'string' ? { description: description.trim() } : {}),
          ...(typeof imageUrl === 'string' ? { imageUrl: imageUrl || null } : {}),
          editedAt: new Date(),
        },
      });

      if (typeof tagsCsv === 'string') {
        const tagNames = Array.from(new Set(tagsCsv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean))).slice(0, 10);
        const tags = await Promise.all(tagNames.map((n) => tx.tag.upsert({ where: { name: n }, create: { name: n }, update: {} })));
        await tx.itemTag.deleteMany({ where: { itemId: params.id } });
        if (tags.length) {
          await tx.itemTag.createMany({ data: tags.map(t => ({ itemId: params.id, tagId: t.id })), skipDuplicates: true });
        }
      }

      return updated.id;
    });
    return NextResponse.json({ ok:true, id: result });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'update_failed' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  if (!(await isAdmin(me))) return NextResponse.json({ ok:false, error:'forbidden' }, { status: 403 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rating.deleteMany({ where: { itemId: params.id } });
      await tx.comment.deleteMany({ where: { itemId: params.id } });
      await tx.itemTag.deleteMany({ where: { itemId: params.id } });
      await tx.report?.deleteMany?.({ where: { itemId: params.id } }).catch(() => {});
      await tx.item.delete({ where: { id: params.id } });
    });
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'delete_failed' }, { status: 400 });
  }
}

