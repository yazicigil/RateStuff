// app/api/items/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST: create a new comment for an existing item (rating required, text optional)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const ratingRaw = Number(body.rating);
    const textRaw = typeof body.comment === "string" ? body.comment : (typeof body.text === "string" ? body.text : "");
    const text = String(textRaw || "").trim();
    const rating = Number.isFinite(ratingRaw) ? Math.round(ratingRaw) : 0;

    // rating zorunlu (1..5)
    if (!(rating >= 1 && rating <= 5)) {
      return NextResponse.json({ ok: false, error: "rating-required" }, { status: 400 });
    }

    // Item var mı?
    const item = await prisma.item.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!item) {
      return NextResponse.json({ ok: false, error: "item-not-found" }, { status: 404 });
    }

    // tek yorum kuralı: aynı item + aynı user için zaten yorum varsa 409
    const existing = await prisma.comment.findFirst({
      where: { itemId: params.id, userId: me.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }

    const created = await prisma.comment.create({
      data: {
        itemId: params.id,
        userId: me.id,
        text,
        rating,
      },
      include: {
        user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, comment: created }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // unique violation (itemId,userId)
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}
