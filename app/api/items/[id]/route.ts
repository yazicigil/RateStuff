import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });

    const body = await req.json();
    const description = body.description ? String(body.description).trim() : undefined;
    const imageUrl    = body.imageUrl === undefined ? undefined : (body.imageUrl ? String(body.imageUrl) : null);
    const tagsCsv     = body.tagsCsv ? String(body.tagsCsv) : undefined;

    // Başlık düzenlemek YOK: name body’den okunmaz, update edilmez.

    // Yetki: sadece kendi eklediği item
    const item = await prisma.item.findUnique({ where:{ id: params.id }, select:{ createdById:true }});
    if (!item) return NextResponse.json({ ok:false, error:"not-found" }, { status:404 });
    if (item.createdById !== me.id) return NextResponse.json({ ok:false, error:"forbidden" }, { status:403 });

    const data:any = {};
    if (description !== undefined) data.description = description;
    if (imageUrl    !== undefined) data.imageUrl    = imageUrl;
    if (Object.keys(data).length) data.editedAt = new Date();

    await prisma.$transaction(async (tx)=>{
      if (Object.keys(data).length) {
        await tx.item.update({ where:{ id: params.id }, data });
      }
      if (tagsCsv !== undefined) {
        const tagNames = Array.from(new Set(tagsCsv.split(",").map((s)=>s.trim().toLowerCase()).filter(Boolean))).slice(0,12);
        // Tagleri güncelle: önce mevcut bağları sil, sonra ekle
        await tx.itemTag.deleteMany({ where:{ itemId: params.id }});
        if (tagNames.length) {
          const tags = await Promise.all(tagNames.map(n => tx.tag.upsert({ where:{ name:n }, create:{ name:n }, update:{} })));
          await tx.itemTag.createMany({ data: tags.map(t=>({ itemId: params.id, tagId: t.id })), skipDuplicates:true });
        }
        await tx.item.update({ where:{ id: params.id }, data:{ editedAt: new Date() }});
      }
    });

    return NextResponse.json({ ok:true });
  } catch(e:any) {
    return NextResponse.json({ ok:false, error: e?.message || "error" }, { status:400 });
  }
}
