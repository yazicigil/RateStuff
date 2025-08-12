// app/api/comments/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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
  if (!me) return NextResponse.json({ ok:false, error:"unauthorized" }, { status: 401 });

  const { text } = await req.json();
  const c = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!c) return NextResponse.json({ ok:false, error:"not_found" }, { status: 404 });
  if (c.userId !== me.id && !(await isAdmin(me))) {
    return NextResponse.json({ ok:false, error:"forbidden" }, { status: 403 });
  }

  await prisma.comment.update({
    where: { id: params.id },
    data: { text: String(text||"").trim(), editedAt: new Date() },
  });
  return NextResponse.json({ ok:true });
}


export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const c = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!c) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (c.userId !== me.id && !(await isAdmin(me))) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}