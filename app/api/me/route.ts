// app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deleteBlobIfVercel } from "@/lib/blob"; // ← eklendi

export async function GET(req: Request) {
  try {
    const me = await getSessionUser();

    // Oturum yoksa NextAuth sign-in ekranına yönlendir (callback olarak geldiğin sayfa)
    if (!me) {
      const url = new URL(req.url);
      const referer = req.headers.get("referer");
      const callback = referer ?? `${url.origin}/`;
      const signin = new URL("/api/auth/signin", url.origin);
      signin.searchParams.set("callbackUrl", callback);
      return NextResponse.redirect(signin);
    }

    // Her bloğu bağımsız yapalım ki biri patlarsa tüm yanıt çökmesin
    const [itemsRes, ratingsRes, commentsRes, savedRes] = await Promise.allSettled([
      prisma.item.findMany({
        where: { createdById: me.id },
        orderBy: { createdAt: "desc" },
        include: { ratings: { select: { value: true } } },
      }),
      prisma.rating.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        include: { item: { select: { id: true, name: true} } },
      }),
      prisma.comment.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        include: { item: { select: { id: true, name: true, imageUrl: true } } },
      }),
      prisma.savedItem.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              editedAt: true,
              createdAt: true,
              ratings: { select: { value: true } },
              tags: { include: { tag: true } },
            },
          },
        },
      }),
    ]);

    const items    = itemsRes.status === "fulfilled" ? itemsRes.value : [];
    const ratings  = ratingsRes.status === "fulfilled" ? ratingsRes.value : [];
    const comments = commentsRes.status === "fulfilled" ? commentsRes.value : [];
    const saved    = savedRes.status === "fulfilled" ? savedRes.value : [];

    const shapeItem = (i: any) => {
      const count = i.ratings?.length ?? 0;
      const avg = count ? i.ratings.reduce((a: number, r: any) => a + r.value, 0) / count : null;
      const edited =
        i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000;

      const tags = Array.isArray(i.tags)
        ? i.tags
            .map((t: any) => t?.tag?.name ?? t?.name)
            .filter((x: any) => typeof x === "string" && x.length > 0)
        : undefined;

      return {
        id: i.id,
        name: i.name,
        description: i.description,
        imageUrl: i.imageUrl,
        avg,
        edited,
        ...(tags ? { tags } : {}),
      };
    };

    const shaped = {
      items: items.map(shapeItem),
      ratings: ratings
        .filter((r: any) => !!r.item)
        .map((r: any) => ({
          id: r.id,
          itemId: r.itemId,
          itemName: r.item.name,
          value: r.value,
        })),
      comments: comments
        .filter((c: any) => !!c.item)
        .map((c: any) => ({
          id: c.id,
          itemId: c.itemId,
          itemName: c.item.name,
          itemImageUrl: c.item.imageUrl,
          text: c.text,
          rating: typeof c.rating === 'number' ? c.rating : undefined,
          edited:
            c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000,
        })),
      saved: saved
        .filter((s: any) => !!s.item)
        .map((s: any) => shapeItem(s.item)),
    };

    return NextResponse.json({
      ok: true,
      me: { id: me.id, name: me.name ?? null, avatarUrl: me.avatarUrl ?? null },
      ...shaped,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "internal-error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me?.id) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body: any = {};
    try { body = await req.json(); } catch {}

    // Accept string or null. Empty string => null (avatar'ı kaldır).
    let nextAvatar: string | null | undefined = undefined;
    if (typeof body?.avatarUrl === "string") {
      const trimmed = body.avatarUrl.trim();
      nextAvatar = trimmed.length ? trimmed : null;
    } else if (body?.avatarUrl === null) {
      nextAvatar = null;
    }

    if (nextAvatar === undefined) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    // Önce mevcut avatar'ı çek
    const prev = await prisma.user.findUnique({
      where: { id: me.id },
      select: { avatarUrl: true },
    });
    // DB'yi güncelle
    await prisma.user.update({
      where: { id: me.id },
      data: { avatarUrl: nextAvatar },
    });

    // Değiştiyse ve eski URL Vercel Blob'sa, sil
    if (prev?.avatarUrl && prev.avatarUrl !== nextAvatar) {
      await deleteBlobIfVercel(prev.avatarUrl);
    }

    return NextResponse.json({ ok: true, avatarUrl: nextAvatar ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "internal-error" },
      { status: 500 }
    );
  }
}