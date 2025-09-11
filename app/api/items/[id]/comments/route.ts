// Helper to fetch brand slug by user id or email (best-effort)
async function getBrandSlug(params: { userId?: string; email?: string }): Promise<string | undefined> {
  const anyPrisma: any = prisma as any;
  try {
    if (params.userId) {
      const byUser = await anyPrisma?.brandAccount?.findFirst?.({
        where: { createdById: params.userId },
        select: { slug: true },
      });
      const s1 = byUser?.slug;
      if (typeof s1 === 'string' && s1.trim()) return s1.trim();
    }
  } catch (_) {}
  try {
    if (params.email) {
      const byEmail = await anyPrisma?.brandAccount?.findFirst?.({
        where: { email: { equals: params.email } },
        select: { slug: true },
      });
      const s2 = byEmail?.slug;
      if (typeof s2 === 'string' && s2.trim()) return s2.trim();
    }
  } catch (_) {}
  return undefined;
}
// app/api/items/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { containsBannedWord } from "@/lib/bannedWords";
import { milestone_ownerItemReviews, milestone_userReviewsGiven } from "@/lib/milestones";

function maskName(input?: string | null): string {
  const name = (input || "Bir kullanıcı").trim();
  if (!name) return "Bir kullanıcı";
  return name
    .split(/\s+/)
    .map((part) => (part.length > 0 ? part[0] + "*".repeat(Math.max(0, part.length - 1)) : part))
    .join(" ");
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

// POST: create a new comment for an existing item (rating required, text optional)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const ratingRaw = Number(body.rating);
    const textRaw = typeof body.comment === "string" ? body.comment : (typeof body.text === "string" ? body.text : "");
    const text = String(textRaw || "").trim();

    if (text && containsBannedWord(text)) {
      return NextResponse.json({ ok: false, error: "banned-word" }, { status: 400 });
    }

    const rating = Number.isFinite(ratingRaw) ? Math.round(ratingRaw) : 0;

    // rating zorunlu (1..5)
    if (!(rating >= 1 && rating <= 5)) {
      return NextResponse.json({ ok: false, error: "rating-required" }, { status: 400 });
    }

    // Item var mı?
    const item = await prisma.item.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!item) {
      return NextResponse.json({ ok: false, error: "item-not-found" }, { status: 404 });
    }

    // tek yorum kuralı: aynı item + aynı user için zaten yorum varsa 409
    const existing = await prisma.comment.findFirst({
      where: { itemId: params.id, userId: me.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }

    const created = await prisma.comment.create({
      data: {
        itemId: params.id,
        userId: me.id,
        text,
        rating,
      },
      include: {
        user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } },
      },
    });

    const createdUserWithBrand = created?.user
      ? { ...created.user, slug: await getBrandSlug({ userId: me.id, email: created.user.email }) }
      : undefined;

    // Bildirim: item sahibine haber ver (sahip farklıysa)
    try {
      const itemOwner = await prisma.item.findUnique({
        where: { id: created.itemId },
        select: { id: true, name: true, createdById: true, imageUrl: true },
      });

      if (itemOwner?.createdById && itemOwner.createdById !== me.id) {
        const stars = created.rating ?? rating ?? 0;

        // Aktör bilgilerini genişlet (kind/verified)
        const actor = await prisma.user.findUnique({
          where: { id: me.id },
          select: { id: true, name: true, maskedName: true, kind: true },
        });
        const actorKind = (actor?.kind as any) ?? undefined; // 'BRAND' | 'DEFAULT' | ...
        const actorVerified = String(actorKind || '').toUpperCase() === 'BRAND' ? true : false;
        const actorName = actor?.name ?? created.user?.name ?? 'Kullanıcı';
        const actorMaskedName = created.user?.maskedName ?? maskName(actorName);

        const isBrandActor = String(actorKind || '').toUpperCase() === 'BRAND';
        const titleName = isBrandActor ? actorName : actorMaskedName;

        await prisma.notification.create({
          data: {
            userId: itemOwner.createdById,
            type: 'COMMENT_ON_OWN_ITEM' as any,
            title: `${titleName} ${stars}★ verdi ve yorum yaptı`,
            body: `“${(created.text ?? '').slice(0, 80)}” • ${itemOwner.name}`,
            link: `/share/${itemOwner.id}`,
            image: itemOwner.imageUrl ?? undefined,
            eventKey: `cmt:${created.id}:${Date.now()}`,
            data: {
              itemId: itemOwner.id,
              rating: stars,
              actorId: actor?.id,
              actorName,
              actorMaskedName,
              actorKind,
              actorVerified,
            },
          },
        });
      }
    } catch (err) {
      console.error('[notify:comment-insert-fail]', err);
    }

    const score = 0; // yeni yorumda oy yok
    const myVote = 0;

    // Milestones: yorum sonrası tetikler
    try {
      await milestone_ownerItemReviews(prisma, created.itemId);
      await milestone_userReviewsGiven(prisma, me.id);
    } catch (err) {
      console.error("[milestone:comment]", err);
    }

    return NextResponse.json({ ok: true, comment: { ...created, user: createdUserWithBrand, score, myVote } }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // unique violation (itemId,userId)
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}
// GET: list comments for an item and augment user.slug from BrandAccount (createdById)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    // 1) Fetch comments for the item
    const rows = await prisma.comment.findMany({
      where: { itemId: params.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } },
      },
    });

    // 2) Collect userIds
    const userIds = Array.from(new Set(rows.map(r => r.user?.id).filter(Boolean) as string[]));

    // Collect emails for secondary fallback
    const emails = Array.from(new Set(rows.map(r => r.user?.email).filter(Boolean) as string[]));

    // 3) Build userId -> slug map via BrandAccount.createdById, then email fallback
    const slugMap = new Map<string, string>();
    try {
      const anyPrisma: any = prisma as any;
      if (userIds.length > 0) {
        const byUser = await anyPrisma?.brandAccount?.findMany?.({
          where: { createdById: { in: userIds } },
          select: { createdById: true, slug: true },
        });
        for (const b of byUser || []) {
          if (b?.createdById && typeof b.slug === 'string' && b.slug.trim()) {
            slugMap.set(b.createdById, b.slug.trim());
          }
        }
      }
      // Email fallback: map users with missing slug by matching BrandAccount.email
      if (emails.length > 0) {
        const byEmail = await anyPrisma?.brandAccount?.findMany?.({
          where: { email: { in: emails } },
          select: { email: true, slug: true },
        });
        const emailToSlug = new Map<string, string>();
        for (const r of byEmail || []) {
          const e = typeof r?.email === 'string' ? r.email : undefined;
          const s = typeof r?.slug === 'string' ? r.slug.trim() : '';
          if (e && s) emailToSlug.set(e, s);
        }
        for (const row of rows) {
          const uid = row.user?.id;
          const em = row.user?.email;
          if (uid && !slugMap.has(uid) && em && emailToSlug.has(em)) {
            slugMap.set(uid, emailToSlug.get(em)!);
          }
        }
      }
    } catch (_) {
      // silently ignore if brandAccount model/fields differ
    }

    // 4) Enrich each comment's user with slug; default score/myVote if absent
    const comments = rows.map(c => {
      const u = c.user ? { ...c.user, slug: c.user.id ? slugMap.get(c.user.id) : undefined } : undefined;
      const score = (c as any).score ?? 0;
      const myVote = (c as any).myVote ?? 0;
      return { ...c, user: u, score, myVote };
    });

    return NextResponse.json({ ok: true, comments }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const { commentId } = body || {};
    if (!commentId) return NextResponse.json({ ok: false, error: 'commentId-required' }, { status: 400 });

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, itemId: true },
    });
    if (!existing || existing.itemId !== params.id) {
      return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
    }

    const isOwner = existing.userId === me.id;
    const isAdmin = (me as any)?.email === 'ratestuffnet@gmail.com' || (me as any)?.isAdmin === true;
    if (!isOwner && !isAdmin) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const data: any = { editedAt: new Date() };
    if (typeof body.text === 'string') {
      if (containsBannedWord(body.text)) {
        return NextResponse.json({ ok: false, error: "banned-word" }, { status: 400 });
      }
      data.text = String(body.text);
    }
    if (body.rating !== undefined) {
      const r = Number(body.rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) {
        return NextResponse.json({ ok: false, error: 'invalid-rating' }, { status: 400 });
      }
      data.rating = Math.round(r);
    }

    await prisma.comment.update({ where: { id: commentId }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
