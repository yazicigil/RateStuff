// app/api/items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { maskName } from "@/lib/mask";

const ADMIN_EMAIL = 'ratestuffnet@gmail.com';

// --- helpers for normalization & dedupe ---
function normalizeText(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function buildDedupeKey(name: string, tags: string[]) {
  const nName = normalizeText(name);
  const nTags = Array.from(new Set(tags.map(t => normalizeText(t)))).sort();
  return `${nName}#${nTags.join(',')}`;
}

function shapeItem(i: any, currentUserId?: string | null) {
  const count = i.ratings?.length ?? 0;
  const avg = count ? i.ratings.reduce((a: number, r: any) => a + r.value, 0) / count : null;
  const itemEdited = i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000;
  const myRating = currentUserId
    ? (i.ratings || []).find((r: any) => r.userId === currentUserId)?.value ?? null
    : null;
  return {
    id: i.id,
    name: i.name,
    description: i.description,
    imageUrl: i.imageUrl,
    avg,
    avgRating: avg,
    count,
    myRating,
    edited: !!itemEdited,
    reportCount: (i as any)._count?.reports ?? (i as any).reportsCount ?? 0,
    createdBy: i.createdBy
      ? {
          id: i.createdBy.id,
          name:
            (i.createdBy as any)?.email === ADMIN_EMAIL
              ? (i.createdBy.name || 'Anonim')
              : (i.createdBy.maskedName ?? (i.createdBy.name ? maskName(i.createdBy.name) : 'Anonim')),
          avatarUrl: i.createdBy.avatarUrl ?? null,
          verified: (i.createdBy as any)?.email === ADMIN_EMAIL,
        }
      : null,
    comments: (i.comments || []).map((c: any) => {
      const cEdited = c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000;
      return {
        id: c.id,
        text: c.text,
        rating: (c as any)?.rating ?? null,
        edited: !!cEdited,
        user: {
          id: c.user?.id,
          name:
            (c.user as any)?.email === ADMIN_EMAIL
              ? (c.user?.name || 'Anonim')
              : (c.user?.maskedName ?? (c.user?.name ? maskName(c.user.name) : 'Anonim')),
          avatarUrl: c.user?.avatarUrl ?? null,
          verified: (c.user as any)?.email === ADMIN_EMAIL,
        },
      };
    }),
    tags: (i.tags || []).map((t: any) => t.tag?.name ?? t.name).filter(Boolean),
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** LISTE (anasayfa) — public */
export async function GET(req: Request) {
  try {
    const me = await getSessionUser().catch(()=>null);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const i = await prisma.item.findUnique({
        where: { id },
        include: {
          ratings: true,
          comments: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } } } },
          tags: { include: { tag: true } },
          createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } },
          _count: { select: { reports: true } },
        },
      });
      if (!i) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
      return NextResponse.json({ ok: true, item: shapeItem(i, me?.id) });
    }

    const q = (searchParams.get("q") || "").trim();
    const order = (searchParams.get("order") || "new") as "new" | "top";

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        ratings: true,
        comments: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } } },
        },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, name: true, maskedName: true, avatarUrl: true, email: true } },
        _count: { select: { reports: true } },
      },
      orderBy:
        order === "top"
          ? { ratings: { _count: "desc" } }
          : { createdAt: "desc" },
      take: 50,
    });

    const shaped = items.map((i) => shapeItem(i, me?.id));

    return NextResponse.json({ ok: true, items: shaped });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}

/** EKLE (form) — auth zorunlu; yoksa signin’e yönlendir */
export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) {
      const url = new URL(req.url);
      const referer = req.headers.get("referer");
      const signin = new URL("/api/auth/signin", url.origin);
      signin.searchParams.set("callbackUrl", referer ?? `${url.origin}/`);
      return NextResponse.redirect(signin);
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    const tagsCsv = String(body.tagsCsv || "");
    const rating = Number(body.rating || 0);
    const comment = String(body.comment || "").trim();

    if (!name || !description) {
      return NextResponse.json({ ok: false, error: "name/description boş" }, { status: 400 });
    }

    const tagNames = Array.from(
      new Set(
        tagsCsv
          .split(",")
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    ).slice(0, 3); // max 3 tag
    if (tagNames.length > 3) {
      return NextResponse.json({ ok:false, error:"En fazla 3 etiket girebilirsin." }, { status: 400 });
    }

    // dedupe: same normalized title + same normalized tag set cannot be created twice
    const dedupeKey = buildDedupeKey(name, tagNames);

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: { name, description, imageUrl, createdById: me.id, dedupeKey },
      });

      if (tagNames.length) {
        const tags = await Promise.all(
          tagNames.map((n) =>
            tx.tag.upsert({
              where: { name: n },
              create: { name: n },
              update: {},
            })
          )
        );
        await tx.itemTag.createMany({
          data: tags.map((t) => ({ itemId: item.id, tagId: t.id })),
          skipDuplicates: true,
        });
      }

      if (rating >= 1 && rating <= 5) {
        await tx.rating.upsert({
          where: { itemId_userId: { itemId: item.id, userId: me.id } },
          create: { itemId: item.id, userId: me.id, value: rating },
          update: { value: rating, editedAt: new Date() },
        });
      }

      if (comment) {
        await tx.comment.create({
          data: { itemId: item.id, userId: me.id, text: comment },
        });
      }

      return { id: item.id };
    });

    return NextResponse.json({ ok: true, itemId: result.id });
  } catch (e: any) {
    if (e?.code === 'P2002' && Array.isArray(e?.meta?.target) && e.meta.target.includes('dedupeKey')) {
      return NextResponse.json({ ok: false, error: 'duplicate-item' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
