// app/api/items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** LISTE (anasayfa) — public */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
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
          include: { user: { select: { id: true, maskedName: true, avatarUrl: true} } },
        },
        tags: { include: { tag: true } },
        createdBy: { select: { id: true, maskedName: true, avatarUrl: true } },
      },
      orderBy:
        order === "top"
          ? { ratings: { _count: "desc" } }
          : { createdAt: "desc" },
      take: 50,
    });

    const shaped = items.map((i) => {
      const count = i.ratings.length;
      const avg = count ? i.ratings.reduce((a, r) => a + r.value, 0) / count : null;
      const itemEdited =
        i.editedAt && i.createdAt && i.editedAt.getTime() > i.createdAt.getTime() + 1000;

      return {
        id: i.id,
        name: i.name,
        description: i.description,
        imageUrl: i.imageUrl,
        avg,
        count,
        edited: !!itemEdited,
        createdBy: i.createdBy
          ? {
              id: i.createdBy.id,
              name: i.createdBy.maskedName ?? "anon",
              avatarUrl: i.createdBy.avatarUrl ?? null,
            }
          : null,
        comments: i.comments.map((c) => {
          const cEdited =
            c.editedAt && c.createdAt && c.editedAt.getTime() > c.createdAt.getTime() + 1000;
          return {
            id: c.id,
            text: c.text,
            edited: !!cEdited,
            user: {
              id: c.user?.id,
              name: c.user?.maskedName ?? "anon",
              avatarUrl: c.user?.avatarUrl ?? null,
            },
          };
        }),
        tags: i.tags.map((t) => t.tag.name),
    }});

    return NextResponse.json(shaped);
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

    // max 3 etiket – önce ham listeyi çıkar, sonra KONTROL ET
    const rawTags = Array.from(
      new Set(
        tagsCsv
          .split(",")
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    );
    if (rawTags.length > 3) {
      return NextResponse.json({ ok:false, error:"En fazla 3 etiket girebilirsin." }, { status: 400 });
    }
    const tagNames = rawTags;

    // dedupe: aynı başlık + aynı etiket seti
    const dedupeKey = buildDedupeKey(name, tagNames);

    const result = await prisma.$transaction(async (tx) => {
      // --- dedupeKey kolonunun DB'de henüz olmaması halinde fallback ---
      let item;
      try {
        item = await tx.item.create({
          data: { name, description, imageUrl, createdById: me.id, dedupeKey },
        });
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        const columnMissing =
          msg.includes('dedupekey') &&
          (msg.includes('does not exist') || msg.includes('unknown') || msg.includes('invalid column'));
        if (columnMissing) {
          // Kolon yoksa dedupeKey’siz tekrar dene (geçici fallback)
          item = await tx.item.create({
            data: { name, description, imageUrl, createdById: me.id },
          });
        } else {
          throw err;
        }
      }

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
    // Prisma unique violation on dedupeKey (kolon mevcutsa)
    if (e?.code === 'P2002' && (
      (Array.isArray(e?.meta?.target) && e.meta.target.includes('dedupeKey')) ||
      String(e?.meta?.target || '').includes('dedupeKey')
    )) {
      return NextResponse.json({ ok:false, error:"Aynı başlık ve etiketlerle bir kayıt zaten var." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}