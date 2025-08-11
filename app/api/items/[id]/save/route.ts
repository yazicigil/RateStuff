// app/api/items/[id]/save/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function redirectToSignin(req: Request) {
  const url = new URL(req.url);
  const referer = req.headers.get("referer") ?? `${url.origin}/`;
  const signin = new URL("/api/auth/signin", url.origin);
  signin.searchParams.set("callbackUrl", referer);
  return NextResponse.redirect(signin);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: true, saved: false });

  const found = await prisma.savedItem.findUnique({
    where: { userId_itemId: { userId: me.id, itemId: params.id } },
    select: { userId: true },
  });

  return NextResponse.json({ ok: true, saved: !!found });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return redirectToSignin(req);

  await prisma.savedItem.upsert({
    where: { userId_itemId: { userId: me.id, itemId: params.id } },
    create: { userId: me.id, itemId: params.id },
    update: {},
  });

  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return redirectToSignin(req);

  await prisma.savedItem.deleteMany({
    where: { userId: me.id, itemId: params.id },
  });

  return NextResponse.json({ ok: true, saved: false });
}
