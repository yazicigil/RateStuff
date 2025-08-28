import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
// Eğer next-auth kullanıyorsan:
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // projendeki yol neyse

const COOKIE = "rs_anon_id";
function uuid() {
  return crypto.randomUUID();
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  let anonId = cookieStore.get(COOKIE)?.value;
  if (!anonId) anonId = uuid();

  const ua = headers().get("user-agent") || "";
  let userId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    userId = (session?.user as any)?.id ?? null;
  } catch {
    // auth yoksa sorun değil, anonim sayarız
  }

  // Upsert by presence.id = anon cookie
  await prisma.presence.upsert({
    where: { id: anonId },
    create: { id: anonId, userId: userId || null },
    update: { userId: userId || null }, // lastSeen is @updatedAt
  });

  const res = NextResponse.json({ ok: true });
  // Cookie’yi 7 gün sakla
  res.cookies.set(COOKIE, anonId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
  return res;
}