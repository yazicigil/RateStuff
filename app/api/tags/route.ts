export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tags = await prisma.tag.findMany({
    where: { items: { some: {} } }, // yalnızca en az bir item'a bağlı etiketler
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tags.map((t) => t.name));
}
