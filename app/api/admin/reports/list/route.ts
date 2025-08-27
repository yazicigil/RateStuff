import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  try {
    await requireAdmin();
    // report’lu item’lar + sayısı, çoktan aza
    const items = await prisma.item.findMany({
      where: { reports: { some: {} } },
      select: {
        id: true, name: true, imageUrl: true, createdAt: true, suspendedAt: true,
        _count: { select: { reports: true } },
      },
      orderBy: [{ reports: { _count: "desc" } }, { createdAt: "desc" }],
      take: 200,
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status });
  }
}