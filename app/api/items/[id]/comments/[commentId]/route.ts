import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string; commentId: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { text } = await req.json();
    const t = String(text ?? "").trim();
    if (!t) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

    const c = await prisma.comment.findUnique({ where: { id: params.commentId } });
    if (!c || c.itemId !== params.id) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    if (c.userId !== me.id) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    await prisma.comment.update({ where: { id: params.commentId }, data: { text: t } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "error" }, { status: 400 });
  }
}
