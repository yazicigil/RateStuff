// app/api/comments/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok:false, error:"unauthorized" }, { status: 401 });

  const { text } = await req.json();
  const c = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!c) return NextResponse.json({ ok:false, error:"not_found" }, { status: 404 });
  if (c.userId !== me.id) return NextResponse.json({ ok:false, error:"forbidden" }, { status: 403 });

  await prisma.comment.update({
    where: { id: params.id },
    data: { text: String(text||"").trim(), editedAt: new Date() },
  });
  return NextResponse.json({ ok:true });
}
