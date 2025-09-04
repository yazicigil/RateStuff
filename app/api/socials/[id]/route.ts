// app/api/socials/[id]/route.ts  (update/delete tek link üzerinde)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { socialLinkUpdateSchema } from "@/lib/socials/schemas";
import { detectPlatform } from "@/lib/socials/detectPlatform";
import { getSessionUser, isAdmin } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const link = await prisma.socialLink.findUnique({ where: { id: params.id } });
  if (!link) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const isOwner = link.userId === sessionUser.id;
  if (!isOwner && !isAdmin(sessionUser))
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = socialLinkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const platform =
    data.url ? (detectPlatform(data.url) ?? null) : undefined; // url değişirse platformu güncelle

  const updated = await prisma.socialLink.update({
    where: { id: link.id },
    data: { ...data, platform },
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const link = await prisma.socialLink.findUnique({ where: { id: params.id } });
  if (!link) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const isOwner = link.userId === sessionUser.id;
  if (!isOwner && !isAdmin(sessionUser))
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  await prisma.socialLink.delete({ where: { id: link.id } });
  return NextResponse.json({ ok: true });
}