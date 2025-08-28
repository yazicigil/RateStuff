// app/api/admin/items/suspended/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const ok = await isAdmin();
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  const where = {
    suspendedAt: { not: null },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { createdBy: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const items = await prisma.item.findMany({
    where,
    orderBy: [{ suspendedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      imageUrl: true,
      createdAt: true,
      suspendedAt: true,
      _count: { select: { reports: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ ok: true, items });
}