import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonUser } from "@/lib/anon";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { text } = await req.json();
    const t = String(text ?? "").trim();
    if (!t) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

    const user = await getAnonUser();
    const itemId = params.id;
    await prisma.comment.create({ data: { itemId, userId: user.id, text: t } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "error" }, { status: 400 });
  }
}
