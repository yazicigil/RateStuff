// app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic"; // Vercel cache'ini zorlama

export async function GET() {
  try {
    const sess = await getSessionUser();
    if (!sess) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // avatarUrl’i garantiye almak için kullanıcıyı DB’den çekiyoruz
    const userFull = await prisma.user.findUnique({
      where: { id: sess.id },
      select: { id: true, name: true, avatarUrl: true },
    });
    if (!userFull) {
      return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
    }

    const [items, ratings, comments, saved] = await Promise.all([
      prisma.item.findMany({
        where: { createdById: userFull.id },
        orderBy: { createdAt: "desc" },
        include: { ratings: { select: { value: true } } },
      }),
      prisma.rating.findMany({
        where: { userId: userFull.id },
        orderBy: { createdAt: "desc" },
        include: { item: { select: { id: true, name: true } } },
      }),
      prisma.comment.findMany({
        where: { userId: userFull.id },
        orderBy: { createdAt: "desc" },
        include: { item: { select: { id: true, name: true } } },
      }),
      prisma.savedItem.findMany({
        where: { userId: userFull.id },
        orderBy: { createdAt: "desc" },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              createdAt: true,
              editedAt: true,
              ratings: { select: { value: true } },
            },
          },
        },
      }),
    ]);

    const shaped = {
      items: items.map((i) => {
        const count = i.ratings.length;
        const avg = count ? i.ratings.reduce((a, r) => a + r.value, 0) / count : null;
        const edited =
          !!(i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000);
        return {
          id: i.id,
          name: i.name,
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
          !!(c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000),
      })),
      saved: saved.map((s) => {
        const i = s.item;
        const count = i.ratings.length;
        const avg = count ? i.ratings.reduce((a, r) => a + r.value, 0) / count : null;
        const edited =
          !!(i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000);
        return {
          id: i.id,
          name: i.name,
          description: i.description,
          imageUrl: i.imageUrl,
          avg,
          edited,
        };
      }),
    };

    return NextResponse.json({
      ok: true,
      me: { id: userFull.id, name: userFull.name, avatarUrl: userFull.avatarUrl ?? null },
      ...shaped,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
