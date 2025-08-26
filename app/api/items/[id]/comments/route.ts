// app/api/items/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { containsBannedWord } from "@/lib/bannedWords";
import { templates } from "@/lib/notify";

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

    if (text && containsBannedWord(text)) {
      return NextResponse.json({ ok: false, error: "banned-word" }, { status: 400 });
    }

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

    const score = 0; // yeni yorumda oy yok
    const myVote = 0;

    // Bildirim: kendi item'ine yorum geldi (sahip farklıysa)
    try {
      const itemForNotify = await prisma.item.findUnique({
        where: { id: created.itemId },
        select: { id: true, name: true, createdById: true, imageUrl: true },
      });

      if (itemForNotify?.createdById && itemForNotify.createdById !== me.id) {
        await templates.commentOnOwnItem({
          ownerId: itemForNotify.createdById,
          actorName: created.user?.name ?? "Bir kullanıcı",
          itemTitle: itemForNotify.name,
          commentText: created.text ?? "",
          itemId: itemForNotify.id,
          thumb: itemForNotify.imageUrl ?? undefined,
        });
      }
    } catch (_) {
      // Bildirim hatası uygulamayı düşürmesin; sessizce yutuyoruz
    }

    return NextResponse.json({ ok: true, comment: { ...created, score, myVote } }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // unique violation (itemId,userId)
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const { commentId } = body || {};
    if (!commentId) return NextResponse.json({ ok: false, error: 'commentId-required' }, { status: 400 });

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, itemId: true },
    });
    if (!existing || existing.itemId !== params.id) {
      return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
    }

    const isOwner = existing.userId === me.id;
    const isAdmin = (me as any)?.email === 'ratestuffnet@gmail.com' || (me as any)?.isAdmin === true;
    if (!isOwner && !isAdmin) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const data: any = { editedAt: new Date() };
    if (typeof body.text === 'string') {
      if (containsBannedWord(body.text)) {
        return NextResponse.json({ ok: false, error: "banned-word" }, { status: 400 });
      }
      data.text = String(body.text);
    }
    if (body.rating !== undefined) {
      const r = Number(body.rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) {
        return NextResponse.json({ ok: false, error: 'invalid-rating' }, { status: 400 });
      }
      data.rating = Math.round(r);
    }

    await prisma.comment.update({ where: { id: commentId }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
