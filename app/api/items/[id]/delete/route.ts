

// app/api/items/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Fallback endpoint for clients that can't call DELETE on /api/items/[id]
// Usage: POST /api/items/:id/delete
export async function POST(
  _req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const itemId = ctx.params?.id;
    if (!itemId) {
      return NextResponse.json({ ok: false, error: "missing-id" }, { status: 400 });
    }

    // Sadece kendisinin oluşturduğu item'ı silebilir
    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true, createdById: true } });
    if (!item) {
      return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
    }
    if (item.createdById !== me.id) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // ilişkili kayıtları temizle
      await tx.rating.deleteMany({ where: { itemId } });
      await tx.comment.deleteMany({ where: { itemId } });
      await tx.savedItem.deleteMany({ where: { itemId } });
      await tx.itemTag.deleteMany({ where: { itemId } });
      // item
      await tx.item.delete({ where: { id: itemId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "delete-failed" },
      { status: 500 }
    );
  }
}