import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { userId, title, body, image, link } = await req.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // kullanıcı var mı?
    const u = await prisma.user.findUnique({ where: { id: String(userId) }, select: { id: true } });
    if (!u) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

    const created = await prisma.notification.create({
      data: {
        userId: u.id,
        // Enum genişletilmeden de çalışsın diye any cast
        type: "ADMIN_DIRECT",
        title: String(title),
        body: String(body),
        image: image ? String(image) : null,
        link: link ? String(link) : null,
        eventKey: `admin:direct:${u.id}:${Date.now()}`,
        data: { kind: "admin_direct", link: link || null, image: image || null },
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status });
  }
}
