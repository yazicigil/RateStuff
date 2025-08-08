export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonUser } from "@/lib/anon";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  tagsCsv: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const order = (searchParams.get("order") || "new") as "new" | "top";

  const where: Prisma.ItemWhereInput = {
    hidden: false,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { tags: { some: { tag: { name: { contains: q, mode: "insensitive" as const } } } } },
          ],
        }
      : {}),
  };

  const items = await prisma.item.findMany({
    where,
    include: {
      ratings: true,
      comments: { take: 2, orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
    },
    orderBy: order === "top" ? { ratings: { _count: "desc" } } : { createdAt: "desc" },

    take: 50,
  });

  return NextResponse.json(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      imageUrl: i.imageUrl,
      avg: i.ratings.length ? i.ratings.reduce((a, r) => a + r.value, 0) / i.ratings.length : null,
      count: i.ratings.length,
      comments: i.comments,
      tags: i.tags.map((t) => t.tag.name),
    }))
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = createSchema.parse({
      ...body,
      rating: typeof body.rating === "string" ? parseInt(body.rating, 10) : body.rating,
    });

    const user = await getAnonUser();
    const tags = data.tagsCsv.split(",").map((t: string) => t.trim()).filter(Boolean);

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl || null,
          createdById: user.id,
        },
      });

      for (const t of tags) {
        const tag = await tx.tag.upsert({ where: { name: t }, update: {}, create: { name: t } });
        await tx.itemTag.create({ data: { itemId: item.id, tagId: tag.id } });
      }

      await tx.rating.create({ data: { itemId: item.id, userId: user.id, value: data.rating } });
      await tx.comment.create({ data: { itemId: item.id, userId: user.id, text: data.comment } });

      return item;
    });

    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "error" }, { status: 400 });
  }
}
