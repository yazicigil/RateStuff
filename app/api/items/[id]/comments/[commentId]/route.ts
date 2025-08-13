import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string; commentId: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { text, rating } = await req.json();
    const clean = String(text ?? "").trim();
    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json({ ok: false, error: "invalid-rating" }, { status: 400 });
    }
    if (clean.length > 1000) {
      return NextResponse.json({ ok: false, error: "too-long" }, { status: 400 });
    }

    const c = await prisma.comment.findUnique({ where: { id: params.commentId } });
    if (!c || c.itemId !== params.id) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    if (c.userId !== me.id) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    await prisma.comment.update({
      where: { id: params.commentId },
      data: { text: clean, rating: score, editedAt: new Date() } as any,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}
