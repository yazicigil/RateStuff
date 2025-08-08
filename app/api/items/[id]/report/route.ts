import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonUser } from "@/lib/anon";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const user = await getAnonUser();
  const id = params.id;
  try {
    await prisma.report.create({ data: { itemId: id, userId: user.id } });
    const count = await prisma.report.count({ where: { itemId: id } });
    if (count >= 3) { // basit eşik
      await prisma.item.update({ where: { id }, data: { hidden: true } });
    }
    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
