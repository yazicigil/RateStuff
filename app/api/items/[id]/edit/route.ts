// app/api/items/[id]/edit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deleteBlobIfVercel } from "@/lib/blob";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const tagsArray = Array.isArray(body.tags) ? body.tags as string[] : undefined;
    const tagsCsv = body.tagsCsv !== undefined ? String(body.tagsCsv) : undefined;

    // Başlık düzenlemek YOK
    const description =
      body.description !== undefined ? String(body.description).trim() : undefined;

    // Boş string => null, undefined => hiç değiştirme
    const rawImage = body.imageUrl;
    const nextImageUrl =
      rawImage === undefined ? undefined : rawImage === "" ? null : String(rawImage);

    // productUrl: undefined => dokunma, "" or null => kaldır (null), string => validate
    const rawProduct = body.productUrl;
    const nextProductUrl =
      rawProduct === undefined
        ? undefined
        : rawProduct === "" || rawProduct === null
        ? null
        : String(rawProduct);

    // Basit validasyon
    if (typeof description === "string" && description.length > 500) {
      return NextResponse.json(
        { ok: false, error: "description çok uzun (≤500 karakter)" },
        { status: 400 }
      );
    }
    if (typeof nextImageUrl === "string" && nextImageUrl.length > 1024) {
      return NextResponse.json(
        { ok: false, error: "imageUrl çok uzun (≤1024 karakter)" },
        { status: 400 }
      );
    }
    if (typeof nextProductUrl === "string") {
      if (nextProductUrl.length > 2048) {
        return NextResponse.json(
          { ok: false, error: "productUrl çok uzun (≤2048 karakter)" },
          { status: 400 }
        );
      }
      try {
        const u = new URL(nextProductUrl);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          return NextResponse.json(
            { ok: false, error: "productUrl protokolü http/https olmalı" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: "geçersiz productUrl" },
          { status: 400 }
        );
      }
    }

    // Yetki + mevcut görsel bilgisi
    const prev = await prisma.item.findUnique({
      where: { id: params.id },
      select: { createdById: true, imageUrl: true },
    });
    if (!prev) {
      return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
    }
    if (prev.createdById !== me.id) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const data: Record<string, any> = {};
    if (description !== undefined) data.description = description;
    if (nextImageUrl !== undefined) data.imageUrl = nextImageUrl;
    if (nextProductUrl !== undefined) data.productUrl = nextProductUrl;
    if (Object.keys(data).length) data.editedAt = new Date();

    await prisma.$transaction(async (tx) => {
      // Item alanları
      if (Object.keys(data).length) {
        await tx.item.update({
          where: { id: params.id },
          data,
        });
      }

      // Tagler
      if (tagsArray !== undefined || tagsCsv !== undefined) {
        const rawNames: string[] = tagsArray !== undefined
          ? tagsArray
          : (tagsCsv || "").split(",");

        const tagNames = Array.from(
          new Set(
            rawNames
              .map((s) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
              .filter(Boolean)
          )
        ).slice(0, 12);

        // Eski bağlantıları sil
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

      // Orphan tag cleanup
      await tx.tag.deleteMany({
        where: { items: { none: {} } },
      });
    });

    // === DB update OK → Eski blob’u temizle (sadece değiştiyse) ===
    if (nextImageUrl !== undefined && prev.imageUrl !== nextImageUrl && prev.imageUrl) {
      await deleteBlobIfVercel(prev.imageUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "error" },
      { status: 400 }
    );
  }
}