import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(_req: Request, { params }: { params: { itemId: string } }) {
  try {
    await requireAdmin();
    const { itemId } = params;

    // item + owner bilgisi
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, createdById: true, suspendedAt: true },
    });
    if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // zaten aktifse tekrar yazma; değilse kaldır
    if (item.suspendedAt) {
      await prisma.item.update({ where: { id: itemId }, data: { suspendedAt: null } });
    }

    // sahibine bilgi ver (opsiyonel)
    if (item.createdById) {
      await prisma.notification.create({
        data: {
          userId: item.createdById,
          type: "ADMIN_DIRECT" as any, // enum eklendiyse any kaldır
          title: "Gönderiniz yayında",
          body: `“${item.name}” adlı gönderiniz tekrar yayına alındı.`,
          link: `/share/${item.id}`,
          image: "/badges/upvote.svg",
          eventKey: `item_unsuspended:${item.id}`,
          data: { itemId: item.id },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}