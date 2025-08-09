import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });

    const itemId = params.id;

    // aynı kullanıcının aynı item'e raporu varsa dokunma, yoksa oluştur
    await prisma.report.upsert({
      where: { itemId_userId: { itemId, userId: user.id } },
      create: { itemId, userId: user.id },
      update: {},
    });

    const count = await prisma.report.count({ where: { itemId } });
    return NextResponse.json({ ok:true, count });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || "error" }, { status:400 });
  }
}
