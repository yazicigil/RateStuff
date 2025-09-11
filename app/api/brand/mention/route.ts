import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const takeParam = Number(searchParams.get("take"));
  const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 200) : 100;
  const effectiveTake = q ? take : Math.max(take, 200);

  const rows = await prisma.brandAccount.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { slug: { startsWith: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { slug: true, displayName: true, coverImageUrl: true, email: true },
    take: effectiveTake,
    orderBy: [{ displayName: "asc" }, { slug: "asc" }],
  });

  // Load user avatars by matching BrandAccount.email to User.email
  const emails = rows.map(r => r.email).filter(Boolean);
  let avatarByEmail: Record<string, string | null> = {};
  if (emails.length) {
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, avatarUrl: true },
    });
    avatarByEmail = Object.fromEntries(users.map(u => [u.email, u.avatarUrl ?? null]));
  }

  const data = rows.map((r) => ({
    slug: r.slug,
    name: r.displayName ?? r.slug,
    avatarUrl: avatarByEmail[r.email] ?? r.coverImageUrl ?? null,
  }));

  return NextResponse.json(data);
}