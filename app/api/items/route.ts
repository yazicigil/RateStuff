import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const order = (searchParams.get("order") || "new") as "new" | "top";

  const where = {
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
      comments: { orderBy: { createdAt: "desc" } }, // ← tüm yorumlar
      tags: { include: { tag: true } },
    },
    orderBy:
      order === "top"
        ? { ratings: { _count: "desc" } } // ← _avg yok; _count destekli
        : { createdAt: "desc" },
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
      comments: i.comments.map((c) => ({ id: c.id, text: c.text, createdAt: c.createdAt.toISOString() })),
      tags: i.tags.map((t) => t.tag.name),
    };
  });

  return NextResponse.json(shaped);
}
