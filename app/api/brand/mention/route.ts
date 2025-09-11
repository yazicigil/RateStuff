import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // lib/prisma.ts mevcut  [oai_citation:3‡git repo file tree (updated).rtf](file-service://file-R4vX7VSknyKLga8gMMYAnn)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return NextResponse.json([]);

  // BrandAccount.slug üzerinden prefix arama (case-insensitive)
  const rows = await prisma.brandAccount.findMany({
    where: { slug: { startsWith: q, mode: "insensitive" } },
    select: { slug: true, displayName: true, coverImageUrl: true },
    take: 8,
    orderBy: { slug: "asc" },
  });

  const data = rows.map(r => ({
    slug: r.slug,
    name: r.displayName ?? r.slug,
    avatarUrl: r.coverImageUrl ?? null, // istersen avatar kaynaklarını sonra zenginleştiririz
  }));

  return NextResponse.json(data);
}