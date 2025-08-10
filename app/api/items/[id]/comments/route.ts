// app/api/items/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const itemId = params.id;
    const { text } = await req.json();
    const clean = String(text ?? "").trim();

    if (!clean) {
      return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
    }
    if (clean.length > 1000) {
      return NextResponse.json({ ok: false, error: "too-long" }, { status: 400 });
    }

    // item var mı?
    const exists = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
    }

    // herkes (giriş yapmış) yorum atabilir: SADECE kendi yorumunu düzenleyebilir
    const comment = await prisma.comment.create({
      data: { itemId, userId: me.id, text: clean },
      include: { user: { select: { maskedName: true, avatarUrl: true } } },
    });

    return NextResponse.json({
      ok: true,
      comment: {
        id: comment.id,
        text: comment.text,
        edited: !!comment.editedAt,
        user: {
          name: comment.user?.maskedName ?? "anon",
          avatarUrl: comment.user?.avatarUrl ?? null,
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}

// (opsiyonel) kendi yorumunu düzenleme
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });

    const { commentId, text } = await req.json();
    const clean = String(text ?? "").trim();
    if (!commentId || !clean) {
      return NextResponse.json({ ok:false, error:"bad-request" }, { status:400 });
    }

    // sahiplik kontrolü
    const c = await prisma.comment.findUnique({ where: { id: commentId }, select: { userId: true, itemId: true }});
    if (!c || c.itemId !== params.id) return NextResponse.json({ ok:false, error:"not-found" }, { status:404 });
    if (c.userId !== me.id) return NextResponse.json({ ok:false, error:"forbidden" }, { status:403 });

    await prisma.comment.update({
      where: { id: commentId },
      data: { text: clean, editedAt: new Date() },
    });

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || "error" }, { status:400 });
  }
}
