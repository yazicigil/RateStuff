// app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  // 1) Oturum + DB’den gerçek kullanıcı (avatarUrl vs.)
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: sess.id },
    select: { id: true, name: true, avatarUrl: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });

  // 2) Veriler
  const [items, ratings, comments, saved] = await Promise.all([
    prisma.item.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      include: { ratings: { select: { value: true } } },
    }),
    prisma.rating.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { item: { select: { id: true, name: true } } },
    }),
    prisma.comment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { item: { select: { id: true, name: true } } },
    }),
    prisma.savedItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            editedAt: true,
            createdAt: true,
            ratings: { select: { value: true } },
          },
        },
      },
    }),
  ]);

  // 3) Shape helpers
  const shapeItem = (i: {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    createdAt: Date;
    editedAt: Date | null;
    ratings: { value: number }[];
  }) => {
    const count = i.ratings.length;
    const avg = count ? i.ratings.reduce((a, r) => a + r.value, 0) / count : null;
    const edited = i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000;
    return { id: i.id, name: i.name, description: i.description, imageUrl: i.imageUrl, avg, edited };
  };

  const shaped = {
    items: items.map(shapeItem),
    ratings: ratings.map(r => ({
      id: r.id,
      itemId: r.itemId,
      itemName: r.item.name,
      value: r.value,
    })),
    comments: comments.map(c => ({
      id: c.id,
      itemId: c.itemId,
      itemName: c.item.name,
      text: c.text,
      edited: c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000,
    })),
    saved: saved.map(s => shapeItem(s.item as any)),
  };

  // 4) Response
  return NextResponse.json({
    ok: true,
    me: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
    ...shaped,
  });
}
