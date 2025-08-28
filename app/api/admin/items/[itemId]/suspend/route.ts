import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(_req: Request, { params }: { params: { itemId: string } }) {
  try {
    await requireAdmin();
    const { itemId } = params;

    // item + owner çek
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, createdById: true, suspendedAt: true },
    });
    if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Zaten askıdaysa tekrar tarih basmayalım (idempotent)
    if (!item.suspendedAt) {
      await prisma.item.update({
        where: { id: itemId },
        data: { suspendedAt: new Date() },
      });
    }

    // sahibine bildirim
    if (item.createdById) {
      // opsiyon: kullanıcının tercihine bak (reportEvents açık mı?)
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: item.createdById },
        select: { reportEvents: true },
      });

      if (!pref || pref.reportEvents) {
        await prisma.notification.create({
          data: {
            userId: item.createdById,
            type: "ADMIN_DIRECT",               // enum eklendiyse any kaldır
            title: "Gönderiniz askıya alındı",
            body: `“${item.name}” adlı gönderiniz çoklu rapor nedeniyle askıya alındı.`,
            link: `/share/${item.id}`,
            image: "/badges/report-warning.svg",          // elindeki kırmızı flag SVG
            eventKey: `item_suspended:${item.id}:${Date.now()}`,     // duplicate önleme
            data: { itemId: item.id, reason: "reports_threshold" },
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}