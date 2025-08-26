// app/api/notifications/read-all/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const res = await prisma.notification.updateMany({
    where: { userId: me.id, readAt: null },
    data: { readAt: now },
  });

  return NextResponse.json({ ok: true, updated: res.count, unreadCount: 0 });
}