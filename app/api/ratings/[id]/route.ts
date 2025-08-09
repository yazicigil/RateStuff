import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });

    const body = await req.json();
    const value = Number(body.value);
    if (!(value >= 1 && value <= 5)) return NextResponse.json({ ok:false, error:"invalid" }, { status:400 });

    const r = await prisma.rating.findUnique({ where:{ id: params.id }, select:{ userId:true }});
    if (!r) return NextResponse.json({ ok:false, error:"not-found" }, { status:404 });
    if (r.userId !== me.id) return NextResponse.json({ ok:false, error:"forbidden" }, { status:403 });

    await prisma.rating.update({ where:{ id: params.id }, data:{ value, editedAt: new Date() }});
    return NextResponse.json({ ok:true });
  } catch(e:any) {
    return NextResponse.json({ ok:false, error:e?.message || "error" }, { status:400 });
  }
}
