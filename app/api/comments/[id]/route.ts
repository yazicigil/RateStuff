import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });

    const body = await req.json();
    const text = String(body.text || "").trim();
    if (!text) return NextResponse.json({ ok:false, error:"empty" }, { status:400 });

    const c = await prisma.comment.findUnique({ where:{ id: params.id }, select:{ userId:true }});
    if (!c) return NextResponse.json({ ok:false, error:"not-found" }, { status:404 });
    if (c.userId !== me.id) return NextResponse.json({ ok:false, error:"forbidden" }, { status:403 });

    await prisma.comment.update({ where:{ id: params.id }, data:{ text, editedAt: new Date() }});
    return NextResponse.json({ ok:true });
  } catch(e:any) {
    return NextResponse.json({ ok:false, error:e?.message || "error" }, { status:400 });
  }
}
