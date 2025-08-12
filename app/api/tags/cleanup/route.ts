

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Manuel bakım: hiçbir item'a bağlı olmayan etiketleri temizler
export async function POST() {
  const res = await prisma.tag.deleteMany({
    where: { items: { none: {} } },
  });
  return NextResponse.json({ ok: true, deleted: res.count });
}