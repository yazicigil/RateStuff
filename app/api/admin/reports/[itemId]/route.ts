import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(_: Request, { params }: { params: { itemId: string } }) {
  try {
    await requireAdmin();
    const itemId = params.itemId;
    const baseItem = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        createdById: true,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
        suspendedAt: true,
      },
    });
    if (!baseItem) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    let item = baseItem as typeof baseItem & { createdBy?: { id: string; name: string | null; email: string | null } | null };
    if (!item.createdBy && item.createdById) {
      const u = await prisma.user.findUnique({
        where: { id: item.createdById },
        select: { id: true, name: true, email: true },
      });
      item = { ...item, createdBy: u } as any;
    }

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

export async function DELETE(_: Request, { params }: { params: { itemId: string } }) {
  try {
    await requireAdmin();
    const itemId = params.itemId;
    if (!itemId) {
      return NextResponse.json({ ok: false, error: "missing_itemId" }, { status: 400 });
    }

    // Delete all reports for this item
    const result = await prisma.report.deleteMany({ where: { itemId } });

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status });
  }
}