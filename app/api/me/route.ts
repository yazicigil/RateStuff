// app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sess = await getSessionUser();
    if (!sess) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 1) Önce id ile, 2) sonra email ile bul, 3) yoksa oluştur
    let user = null as null | { id: string; name: string | null; avatarUrl: string | null; email: string };

    if (sess.id) {
      user = await prisma.user.findUnique({
        where: { id: sess.id },
        select: { id: true, name: true, avatarUrl: true, email: true },
      });
    }
    if (!user && sess.email) {
      user = await prisma.user.findUnique({
        where: { email: sess.email },
        select: { id: true, name: true, avatarUrl: true, email: true },
      });
    }
    if (!user) {
      if (!sess.email) {
        return NextResponse.json({ ok: false, error: "no-email" }, { status: 400 });
      }
      user = await prisma.user.create({
        data: {
          email: sess.email,
          name: sess.name ?? null,
          avatarUrl: (sess as any).avatarUrl ?? null,
        },
        select: { id: true, name: true, avatarUrl: true, email: true },
      });
    }

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
        const edited = !!(i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000);
        return { id: i.id, name: i.name, description: i.description, imageUrl: i.imageUrl, avg, edited };
      }),
      ratings: ratings.map((r) => ({ id: r.id, itemId: r.itemId, itemName: r.item.name, value: r.value })),
      comments: comments.map((c) => ({
        id: c.id,
        itemId: c.itemId,
        itemName: c.item.name,
        text: c.text,
        edited: !!(c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000),
      })),
      saved: saved.map((s) => {
        const i = s.item;
        const count = i.ratings.length;
        const avg = count ? i.ratings.reduce((a, r) => a + r.value, 0) / count : null;
        const edited = !!(i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000);
        return { id: i.id, name: i.name, description: i.description, imageUrl: i.imageUrl, avg, edited };
      }),
    };

    return NextResponse.json({
      ok: true,
      me: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      ...shaped,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
