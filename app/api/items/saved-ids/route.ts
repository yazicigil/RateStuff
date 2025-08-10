import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok:true, ids: [] }); // anonim: boş
  const rows = await prisma.itemSave.findMany({
    where: { userId: me.id },
    select: { itemId: true }
  });
  return NextResponse.json({ ok:true, ids: rows.map(r => r.itemId) });
}
