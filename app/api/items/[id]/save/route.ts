// app/api/items/[id]/save/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const itemId = params.id;

  // item var mı (güvenlik)
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });

  // Toggle saved
  const existing = await prisma.savedItem.findUnique({
    where: { userId_itemId: { userId: me.id, itemId } },
  });

  if (existing) {
    await prisma.savedItem.delete({
      where: { userId_itemId: { userId: me.id, itemId } },
    });
    return NextResponse.json({ ok: true, saved: false });
  } else {
    await prisma.savedItem.create({
      data: { userId: me.id, itemId },
    });
    return NextResponse.json({ ok: true, saved: true });
  }
}
