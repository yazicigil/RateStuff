import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: true, saved: false });

  const found = await prisma.savedItem.findUnique({
    where: { userId_itemId: { userId: me.id, itemId: params.id } },
    select: { userId: true },
  });

  return NextResponse.json({ ok: true, saved: !!found });
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  await prisma.savedItem.upsert({
    where: { userId_itemId: { userId: me.id, itemId: params.id } },
    create: { userId: me.id, itemId: params.id },
    update: {},
  });

  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  await prisma.savedItem.deleteMany({
    where: { userId: me.id, itemId: params.id },
  });

  return NextResponse.json({ ok: true, saved: false });
}
