// app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  // 1) Oturum kontrolü
  const s = await getSessionUser();
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // 2) Kullanıcıyı DB'den avatarUrl ile çek
  const me = await prisma.user.findUnique({
    where: { id: s.id },
    select: { id: true, name: true, avatarUrl: true },
  });
  if (!me) return NextResponse.json({ ok: false, error: "user-not-found" }, { status: 404 });

  // 3) Veriler
  const [items, ratings, comments] = await Promise.all([
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
  ]);

  // 4) Şekillendir
  const shaped = {
    items: items.map((i) => {
      const count = i.ratings.length;
      const avg = count ? i.ratings.reduce((a, r) => a + r.value, 0) / count : null;
      const edited =
        !!i.editedAt && !!i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000;
      return {
        id: i.id,
        name: i.name, // başlık düzenlenemez
        description: i.description,
        imageUrl: i.imageUrl,
        avg,
        edited,
      };
    }),
    ratings: ratings.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      itemName: r.item.name,
      value: r.value,
    })),
    comments: comments.map((c) => ({
      id: c.id,
      itemId: c.itemId,
      itemName: c.item.name,
      text: c.text,
      edited:
        !!c.editedAt && !!c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000,
    })),
  };

  // 5) Response
  return NextResponse.json({
    ok: true,
    me: { id: me.id, name: me.name, avatarUrl: me.avatarUrl },
    ...shaped,
  });
}
