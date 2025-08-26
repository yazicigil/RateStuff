// app/api/notifications/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const status = (searchParams.get("status") ?? "all") as "all" | "unread";
  const cursor = searchParams.get("cursor"); // createdAt ISO string

  const where: any = { userId: me.id };
  if (status === "unread") where.readAt = null;
  if (cursor) where.createdAt = { lt: new Date(cursor) };

  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1, // cursor pagination
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      image: true,
      data: true,
      readAt: true,
      createdAt: true,
    },
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null;

  const unreadCount = await prisma.notification.count({
    where: { userId: me.id, readAt: null },
  });

  return NextResponse.json({
    ok: true,
    items: page,
    nextCursor,
    unreadCount,
  });
}