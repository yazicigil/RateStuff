// app/api/items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** LISTE (anasayfa) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const order = (searchParams.get("order") || "new") as "new" | "top";

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        ratings: true,
        comments: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, maskedName: true, avatarUrl: true } } },
        },
        tags: { include: { tag: true } },
        // EKLEYEN KİŞİ
        createdBy: { select: { id: true, maskedName: true, avatarUrl: true } },
      },
      orderBy: order === "top" ? { ratings: { _count: "desc" } } : { createdAt: "desc" },
      take: 50,
    });

    const shaped = items.map((i) => {
      const count = i.ratings.length;
      const avg = count ? i.ratings.reduce((a, r) => a + r.value, 0) / count : null;

      return {
        id: i.id,
        name: i.name,
        description: i.description,
        imageUrl: i.imageUrl,
        avg,
        count,
        createdBy: i.createdBy
          ? {
              id: i.createdBy.id,
              name: i.createdBy.maskedName ?? "anon",
              avatarUrl: i.createdBy.avatarUrl ?? null,
            }
          : null,
        comments: i.comments.map((c) => ({
          id: c.id,
          text: c.text,
          user: {
            id: c.user?.id,
            name: c.user?.maskedName ?? "anon",
            avatarUrl: c.user?.avatarUrl ?? null,
          },
        })),
        tags: i.tags.map((t) => t.tag.name),
      };
    });

    return NextResponse.json(shaped);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}

/** EKLE (form) – değişmedi */
export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    const tagsCsv = String(body.tagsCsv || "");
    const rating = Number(body.rating || 0);
    const comment = String(body.comment || "").trim();

    if (!name || !description) {
      return NextResponse.json({ ok: false, error: "name/description boş" }, { status: 400 });
    }

    const tagNames = Array.from(
      new Set(tagsCsv.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean))
    ).slice(0, 12);

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        // NOT: createdById alanın yoksa buradan çıkar
        data: { name, description, imageUrl, createdById: me.id },
      });

      if (tagNames.length) {
        const tags = await Promise.all(
          tagNames.map((n) =>
            tx.tag.upsert({
              where: { name: n },
              create: { name: n },
              update: {},
            })
          )
        );
        await tx.itemTag.createMany({
          data: tags.map((t) => ({ itemId: item.id, tagId: t.id })),
          skipDuplicates: true,
        });
      }

      if (rating >= 1 && rating <= 5) {
        await tx.rating.upsert({
          where: { itemId_userId: { itemId: item.id, userId: me.id } },
          create: { itemId: item.id, userId: me.id, value: rating },
          update: { value: rating, editedAt: new Date() },
        });
      }

      if (comment) {
        await tx.comment.create({
          data: { itemId: item.id, userId: me.id, text: comment },
        });
      }

      return { id: item.id };
    });

    return NextResponse.json({ ok: true, itemId: result.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}
