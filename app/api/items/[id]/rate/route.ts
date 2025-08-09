import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { value } = await req.json();
    const v = Number(value);
    if (!v || v < 1 || v > 5) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

    await prisma.rating.upsert({
      where: { itemId_userId: { itemId: params.id, userId: me.id } }, // ← tekil anahtar
      create: { itemId: params.id, userId: me.id, value: v },
      update: { value: v, editedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "error" }, { status: 400 });
  }
}
