// app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const [items, ratings, comments, saved] = await Promise.all([
      prisma.item.findMany({
        where: { createdById: me.id },
        orderBy: { createdAt: "desc" },
        include: { ratings: { select: { value: true } } },
      }),
      prisma.rating.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        include: { item: { select: { id: true, name: true } } },
      }),
      prisma.comment.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        include: { item: { select: { id: true, name: true } } },
      }),
      prisma.savedItem.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        include: {
          item: {
            select: {
              id: true, name: true, description: true, imageUrl: true,
              editedAt: true, createdAt: true,
              ratings: { select: { value: true } },
            },
          },
        },
      }),
    ]);

    const shapeItem = (i: any) => {
      const count = i.ratings.length;
      const avg = count ? i.ratings.reduce((a: number, r: any) => a + r.value, 0) / count : null;
      const edited =
        i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000;
      return { id: i.id, name: i.name, description: i.description, imageUrl: i.imageUrl, avg, edited };
    };

    const shaped = {
      items: items.map(shapeItem),
      ratings: ratings.map((r) => ({ id: r.id, itemId: r.itemId, itemName: r.item.name, value: r.value })),
      comments: comments.map((c) => ({
        id: c.id,
        itemId: c.itemId,
        itemName: c.item.name,
        text: c.text,
        edited: c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000,
      })),
      saved: saved.map((s) => shapeItem(s.item)),
    };

    // me objesinde sadece id/name/avatarUrl var; email eklemiyoruz
    return NextResponse.json({
      ok: true,
      me: { id: me.id, name: me.name ?? null, avatarUrl: me.avatarUrl ?? null },
      ...shaped,
    });
  } catch (e: any) {
    // Her durumda JSON dön
    return NextResponse.json(
      { ok: false, error: e?.message || "internal-error" },
      { status: 500 },
    );
  }
}
