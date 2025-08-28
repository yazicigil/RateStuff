import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const ok = await isAdmin();
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "30", 10), 100);
  const cursor = url.searchParams.get("cursor"); // last seen item id

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { createdBy: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const items = await prisma.item.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
    select: {
      id: true,
      name: true,
      imageUrl: true,
      createdAt: true,
      suspendedAt: true,
      _count: { select: { comments: true, reports: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const last = items.pop()!;
    nextCursor = last.id;
  }

  return NextResponse.json({ ok: true, items, nextCursor });
}