// app/api/notifications/read/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  if (!ids.length) return NextResponse.json({ ok: false, error: "ids-required" }, { status: 400 });

  const now = new Date();
  const res = await prisma.notification.updateMany({
    where: { id: { in: ids }, userId: me.id, readAt: null },
    data: { readAt: now },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: me.id, readAt: null },
  });

  return NextResponse.json({ ok: true, updated: res.count, unreadCount });
}