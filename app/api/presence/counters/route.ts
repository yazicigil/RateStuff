import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Son 45 sn içinde ping atanlar online sayılır
  const since = new Date(Date.now() - 45_000);

  const [total, authed] = await Promise.all([
    prisma.presence.count({ where: { lastSeen: { gte: since } } }),
    prisma.presence.count({ where: { lastSeen: { gte: since }, NOT: { userId: null } } }),
  ]);

  return NextResponse.json({ ok: true, total, authed });
}