// app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deleteBlobIfVercel } from "@/lib/blob"; // ← eklendi

export async function GET(req: Request) {
  try {
    const me = await getSessionUser();
    const meEmail = (me as any)?.email ?? null;
    const meIsAdmin = Boolean((me as any)?.isAdmin);

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
        include: {
          ratings: { select: { value: true } },
          tags: { include: { tag: true } },
          createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, isAdmin: true, email: true } },
        },
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
            include: {
              ratings: { select: { value: true } },
              tags: { include: { tag: true } },
              createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, isAdmin: true, email: true } },
            },
          },
        },
      }),
    ]);

    const items    = itemsRes.status === "fulfilled" ? itemsRes.value : [];
    const ratings  = ratingsRes.status === "fulfilled" ? ratingsRes.value : [];
    const comments = commentsRes.status === "fulfilled" ? commentsRes.value : [];
    const saved    = savedRes.status === "fulfilled" ? savedRes.value : [];

    // ---- Aggregate ratings + comment.ratings (positive only), de-duplicated per (itemId,userId) by latest timestamp ----
    const idsFromItems = Array.isArray(items) ? items.map((i: any) => i.id).filter(Boolean) : [];
    const idsFromSaved = Array.isArray(saved) ? saved.map((s: any) => s?.item?.id).filter(Boolean) : [];
    const uniqueIds = Array.from(new Set<string>([...idsFromItems, ...idsFromSaved]));
  
    type UserVote = { itemId: string; userId: string; val: number; ts: number };
    const latestByUser = new Map<string, UserVote>(); // key: `${itemId}::${userId}`
  
    function tsOf(d: { createdAt: Date; editedAt?: Date | null }) {
      const e = (d as any).editedAt as Date | null | undefined;
      const c = (d as any).createdAt as Date;
      return e && e.getTime && e.getTime() > 0 ? e.getTime() : c.getTime();
    }
  
    if (uniqueIds.length) {
      // 1) Pull positive standalone ratings
      const posRatings = await prisma.rating.findMany({
        where: { itemId: { in: uniqueIds }, value: { gt: 0 } },
        select: { itemId: true, userId: true, value: true, createdAt: true, editedAt: true },
      });
      for (const r of posRatings) {
        const key = `${r.itemId}::${r.userId}`;
        const cand: UserVote = { itemId: r.itemId, userId: r.userId, val: r.value, ts: tsOf(r) };
        const cur = latestByUser.get(key);
        if (!cur || cand.ts > cur.ts) latestByUser.set(key, cand);
      }
  
      // 2) Pull positive comment-embedded ratings
      const posComments = await prisma.comment.findMany({
        where: { itemId: { in: uniqueIds }, rating: { gt: 0 } },
        select: { itemId: true, userId: true, rating: true, createdAt: true, editedAt: true },
      });
      for (const c of posComments) {
        const key = `${c.itemId}::${c.userId}`;
        const cand: UserVote = { itemId: c.itemId, userId: c.userId, val: c.rating, ts: tsOf(c) };
        const cur = latestByUser.get(key);
        if (!cur || cand.ts > cur.ts) latestByUser.set(key, cand);
      }
    }
  
    // 3) Reduce to per-item aggregates
    const agg = new Map<string, { sum: number; count: number }>();
    for (const v of latestByUser.values()) {
      const a = agg.get(v.itemId) ?? { sum: 0, count: 0 };
      a.sum += v.val;
      a.count += 1;
      agg.set(v.itemId, a);
    }
  
    function getAggFor(id: string) {
      const a = agg.get(id) ?? { sum: 0, count: 0 };
      const avgRating = a.count ? a.sum / a.count : null;
      return { avgRating, count: a.count };
    }

    function maskName(name: string | null | undefined): string | null {
      if (!name) return null;
      const parts = String(name).split(" ").filter(Boolean);
      return parts
        .map((p, idx) => {
          if (!p.length) return "";
          if (idx === 0) {
            return p[0] + (p.length > 1 ? "*" : "");
          }
          return p[0] + "*".repeat(Math.max(1, p.length - 1));
        })
        .join(" ");
    }

    const shapeItem = (i: any) => {
      const { avgRating, count } = getAggFor(i.id);
      const edited =
        i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000;

      const tags = Array.isArray(i.tags)
        ? i.tags
            .map((t: any) => t?.tag?.name ?? t?.name)
            .filter((x: any) => typeof x === "string" && x.length > 0)
        : undefined;

      const createdByEmail = (i as any)?.createdBy?.email as string | undefined;
      const isCreatedByVerified = Boolean((i as any)?.createdBy?.isAdmin) || (createdByEmail === 'ratestuffnet@gmail.com');

      return {
        id: i.id,
        name: i.name,
        description: i.description,
        imageUrl: i.imageUrl,
        suspended: Boolean(i.suspendedAt),
        // keep `avg` for backward-compat; prefer `avgRating` on the client (avg = avgRating)
        avg: avgRating,
        avgRating,
        count,
        edited,
        ...(tags ? { tags } : {}),
        ...(i?.createdBy ? {
          createdBy: {
            id: i.createdBy.id,
            name: (() => {
              const isSelf = i.createdBy.id === me.id;
              const raw = i.createdBy.name ?? i.createdBy.maskedName ?? null;
              return (isCreatedByVerified || isSelf) ? (i.createdBy.name ?? raw) : (maskName(raw) ?? null);
            })(),
            avatarUrl: i.createdBy.avatarUrl ?? null,
            verified: isCreatedByVerified,
          },
          createdByName: (() => {
            const isSelf = i.createdBy.id === me.id;
            const raw = i.createdBy.name ?? i.createdBy.maskedName ?? null;
            return (isCreatedByVerified || isSelf) ? (i.createdBy.name ?? raw) : (maskName(raw) ?? null);
          })(),
          createdByAvatarUrl: i.createdBy.avatarUrl ?? null,
        } : {}),
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
      me: {
        id: me.id,
        name: me.name ?? null,
        avatarUrl: me.avatarUrl ?? null,
        email: meEmail,
        isAdmin: meIsAdmin,
        kind: (me as any)?.kind ?? null,
      },
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