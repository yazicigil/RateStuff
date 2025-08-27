import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(_: Request, { params }: { params: { userId: string } }) {
  try {
    await requireAdmin();
    const userId = params.userId;

    // Kullanıcı bilgisi
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Paylaştığı item’lar
    const items = await prisma.item.findMany({
      where: { createdById: userId },
      select: { id: true, name: true, imageUrl: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Yorum & puanlar (tek listede)
    const rawComments = await prisma.comment.findMany({
      where: { userId },
      include: { item: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }) as any[]; // alan isimleri projeye göre farklı olabilir

    const comments = rawComments.map((c: any) => ({
      id: c.id,
      createdAt: c.createdAt,
      text: c.text ?? c.content ?? c.body ?? null,     // esnek alan adı
      stars: c.stars ?? c.rating ?? null,              // varsa puan
      item: c.item ? { id: c.item.id, name: c.item.name } : null,
    }));

    return NextResponse.json({ ok: true, user, items, comments });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: e?.status ?? 500 });
  }
}