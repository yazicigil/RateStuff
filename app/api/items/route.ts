import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonUser } from "@/lib/anon";
import { z } from "zod";
import type { Prisma } from "@prisma/client"; // ← önemli

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
            {
              tags: {
                some: {
                  tag: { name: { contains: q, mode: "insensitive" as const } },
                },
              },
            },
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
    orderBy:
      order === "top"
        ? { ratings: { _avg: { value: "desc" } } }
        : { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      imageUrl: i.imageUrl,
      avg: i.ratings.length
        ? i.ratings.reduce((a, r) => a + r.value, 0) / i.ratings.len
