import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });

  const itemId = params.id;

  const exists = await prisma.itemSave.findUnique({
    where: { userId_itemId: { userId: me.id, itemId } }
  });

  if (exists) {
    await prisma.itemSave.delete({ where: { userId_itemId: { userId: me.id, itemId } } });
    return NextResponse.json({ ok:true, saved:false });
  } else {
    await prisma.itemSave.create({ data: { userId: me.id, itemId } });
    return NextResponse.json({ ok:true, saved:true });
  }
}
