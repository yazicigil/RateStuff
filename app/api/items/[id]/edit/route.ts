import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Başlık düzenlemek YOK
    const description =
      body.description !== undefined
        ? String(body.description).trim()
        : undefined;

    // Boş string => null, undefined => hiç değiştirme
    const rawImage = body.imageUrl;
    const imageUrl =
      rawImage === undefined
        ? undefined
        : rawImage === ""
        ? null
        : String(rawImage);

    const tagsCsv =
      body.tagsCsv !== undefined ? String(body.tagsCsv) : undefined;

    // Basit validasyon
    if (typeof description === "string" && description.length > 500) {
      return NextResponse.json(
        { ok: false, error: "description çok uzun (≤500 karakter)" },
        { status: 400 }
      );
    }
    if (typeof imageUrl === "string" && imageUrl.length > 1024) {
      return NextResponse.json(
        { ok: false, error: "imageUrl çok uzun (≤1024 karakter)" },
        { status: 400 }
      );
    }

    // Yetki kontrolü
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      select: { createdById: true },
    });
    if (!item) {
      return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
    }
    if (item.createdById !== me.id) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const data: any = {};
    if (description !== undefined) data.description = description;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (Object.keys(data).length) data.editedAt = new Date();

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) {
        await tx.item.update({
          where: { id: params.id },
          data,
        });
      }
      if (tagsCsv !== undefined) {
        const tagNames = Array.from(
          new Set(
            tagsCsv
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
          )
        ).slice(0, 12);

        // Eski tag bağlantılarını sil
        await tx.itemTag.deleteMany({ where: { itemId: params.id } });

        // Yeni tagleri ekle
        if (tagNames.length) {
          const tags = await Promise.all(
            tagNames.map((n) =>
              tx.tag.upsert({ where: { name: n }, create: { name: n }, update: {} })
            )
          );
          await tx.itemTag.createMany({
            data: tags.map((t) => ({ itemId: params.id, tagId: t.id })),
            skipDuplicates: true,
          });
        }

        // Tag değişikliği de düzenleme sayılır
        await tx.item.update({
          where: { id: params.id },
          data: { editedAt: new Date() },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "error" },
      { status: 400 }
    );
  }
}
