import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function makeMaskedNameFromHuman(name?: string | null, fallbackEmail?: string) {
  const src = (name || fallbackEmail?.split("@")[0] || "Anon").trim();
  const parts = src.replace(/[_.-]+/g, " ").split(/\s+/).filter(Boolean).slice(0,3);
  const maskPart = (p: string) => {
    const first = p.trim().charAt(0);
    const upper = first ? first.toLocaleUpperCase("tr-TR") : "•";
    return `${upper}****`;
  };
  if (parts.length === 0) return "A****";
  if (parts.length === 1) return maskPart(parts[0]);
  return `${maskPart(parts[0])} ${maskPart(parts[1])}`;
}

export async function POST(req: Request) {
  // basit bir koruma – istersen env'den SECRET koy
  const url = new URL(req.url);
  if (url.searchParams.get("confirm") !== "yes") {
    return NextResponse.json({ ok: false, error: "confirm=yes ekle" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, maskedName: true },
  });

  let updated = 0;
  for (const u of users) {
    const desired = makeMaskedNameFromHuman(u.name, u.email);
    if (u.maskedName !== desired) {
      await prisma.user.update({ where: { id: u.id }, data: { maskedName: desired } });
      updated++;
    }
  }
  return NextResponse.json({ ok: true, updated });
}
