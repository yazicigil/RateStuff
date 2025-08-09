// app/api/items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    const tagsCsv = String(body.tagsCsv || "");
    const rating = Number(body.rating || 0);
    const comment = String(body.comment || "").trim();

    if (!name || !description) {
      return NextResponse.json({ ok:false, error:"name/description boş" }, { status: 400 });
    }

    const tagNames = Array.from(new Set(
      tagsCsv.split(",").map((s:string)=>s.trim()).filter(Boolean)
    )).slice(0, 12);

    const result = await prisma.$transaction(async (tx) => {
      // 1) Item
      const item = await tx.item.create({
        data: { name, description, imageUrl, createdById: me.id },
      });

      // 2) Tagleri hazırla (varsa reuse)
      if (tagNames.length) {
        const tags = await Promise.all(tagNames.map(n =>
          tx.tag.upsert({
            where: { name: n.toLowerCase() },
            create: { name: n.toLowerCase() },
            update: {},
          })
        ));
        await tx.itemTag.createMany({
          data: tags.map(t => ({ itemId: item.id, tagId: t.id })),
          skipDuplicates: true,
        });
      }

      // 3) Rating (kullanıcı başına 1, upsert)
      if (rating >= 1 && rating <= 5) {
        await tx.rating.upsert({
          where: { itemId_userId: { itemId: item.id, userId: me.id } },
          create: { itemId: item.id, userId: me.id, value: rating },
          update: { value: rating, editedAt: new Date() },
        });
      }

      // 4) Comment (opsiyonel)
      if (comment) {
        await tx.comment.create({
          data: { itemId: item.id, userId: me.id, text: comment },
        });
      }

      return { id: item.id };
    });

    return NextResponse.json({ ok: true, itemId: result.id });
  } catch (e:any) {
    // Supabase constraint/nullable vs. tüm hatalar buraya düşer
    return NextResponse.json({ ok:false, error: e?.message || "error" }, { status: 400 });
  }
}
