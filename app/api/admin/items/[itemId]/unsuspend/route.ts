import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(_req: Request, { params }: { params: { itemId: string } }) {
  try {
    await requireAdmin();
    const { itemId } = params;

    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    await prisma.item.update({
      where: { id: itemId },
      data: { suspendedAt: null },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}