import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const ci = Prisma.QueryMode.insensitive;
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: ci } },
            { email: { contains: q, mode: ci } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { items: true, comments: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 50,
    });

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: e?.status ?? 500 });
  }
}