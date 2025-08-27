import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(_: Request, { params }: { params: { itemId: string } }) {
  try {
    await requireAdmin();
    const itemId = params.itemId;
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, imageUrl: true },
    });
    if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const reports = await prisma.report.findMany({
      where: { itemId },
      include: {
        user: { select: { id: true, name: true, email: true } }, // maskesiz gösteriyoruz
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ ok: true, item, reports });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status });
  }
}