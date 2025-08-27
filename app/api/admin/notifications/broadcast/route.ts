import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { title, body, image, link } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // Tüm kullanıcılar
    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length === 0) return NextResponse.json({ ok: true, created: 0 });

    // Enum’a yeni değer eklemek istemiyorsan şimdilik "MILESTONE_REACHED" kullanıyoruz.
    // İleride enum’a ADMIN_BROADCAST ekleriz.
    const rows = users.map(u => ({
      userId: u.id,
      type: "ADMIN_BROADCAST" as any, // TODO: enum'a 'ADMIN_BROADCAST' ekle
      title,
      body,
      image: image || null,
      link: link || null,
      data: { kind: "broadcast", link, image },
      eventKey: null,
    }));

    const r = await prisma.notification.createMany({ data: rows });
    return NextResponse.json({ ok: true, created: r.count });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status });
  }
}