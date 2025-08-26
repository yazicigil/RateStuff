import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  // TS’nin “id yok” itirazını by-pass edip sağlam userId çıkaralım:
  const tokenId = (session as any)?.user?.id as string | undefined;

  let userId = tokenId;
  if (!userId) {
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ unread: 0 });
    const u = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!u) return NextResponse.json({ unread: 0 });
    userId = u.id;
  }

  const unread = await prisma.notification.count({
    where: { userId, readAt: null },
  });
  return NextResponse.json({ unread });
}