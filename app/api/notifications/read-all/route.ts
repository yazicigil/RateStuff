// app/api/notifications/read-all/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // "delete" = kalıcı sil

  const now = new Date();
  if (mode === "delete") {
    const res = await prisma.notification.deleteMany({
      where: { userId: me.id },
    });
    return NextResponse.json({ ok: true, deleted: res.count, unreadCount: 0 });
  } else {
    const res = await prisma.notification.updateMany({
      where: { userId: me.id, readAt: null },
      data: { readAt: now },
    });
    return NextResponse.json({ ok: true, updated: res.count, unreadCount: 0 });
  }
}