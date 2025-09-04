import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { socialLinkCreateSchema } from "@/lib/socials/schemas";
import { detectPlatform } from "@/lib/socials/detectPlatform";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  // Editor ve read-only aynı endpoint’i kullanıyor.
  // Buradan TÜM linkleri döndürüyoruz; SocialBar zaten visible=true filtreliyor.
  const items = await prisma.socialLink.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { userId } = params;
  const isOwner = sessionUser.id === userId;
  if (!isOwner && !sessionUser.isAdmin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = socialLinkCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const platform = detectPlatform(parsed.data.url) ?? undefined;

  // order gönderilmediyse sona ekle
  const last = await prisma.socialLink.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = parsed.data.order ?? (last ? last.order + 1 : 0);

  const created = await prisma.socialLink.create({
    data: {
      userId,
      url: parsed.data.url,
      label: parsed.data.label,
      visible: parsed.data.visible ?? true,
      order: nextOrder,
      platform,
    },
  });

  return NextResponse.json({ ok: true, item: created });
}