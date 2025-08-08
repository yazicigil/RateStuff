import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonUser } from "@/lib/anon";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAnonUser();
    const itemId = params.id;

    await prisma.report.upsert({
      where: { itemId_userId: { itemId, userId: user.id } },
      create: { itemId, userId: user.id },
      update: {},
    });

    const count = await prisma.report.count({ where: { itemId } });
    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "error" }, { status: 400 });
  }
}
