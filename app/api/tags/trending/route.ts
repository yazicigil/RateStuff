export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // son 200 item içinde en çok görünen ilk 5 tag
  const recent = await prisma.itemTag.groupBy({
    by: ["tagId"],
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 5
  });
  const tags = await prisma.tag.findMany({ where: { id: { in: recent.map(r => r.tagId) } } });
  const ordered = recent.map(r => tags.find(t => t.id === r.tagId)?.name).filter(Boolean);
  return NextResponse.json(ordered);
}
