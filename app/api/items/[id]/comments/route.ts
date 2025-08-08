import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { text } = await req.json();
    const t = String(text ?? "").trim();
    if (!t) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

    await prisma.comment.create({ data: { itemId: params.id, userId: me.id, text: t } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "error" }, { status: 400 });
  }
}
