// app/api/items/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { maskName } from "@/lib/mask";

function redirectToSignin(req: Request) {
  const url = new URL(req.url);
  const referer = req.headers.get("referer") ?? `${url.origin}/`;
  const signin = new URL("/api/auth/signin", url.origin);
  signin.searchParams.set("callbackUrl", referer);
  return NextResponse.redirect(signin);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getSessionUser();
    if (!me) {
      // ❗ Oturum yoksa 401 yerine signin'e yönlendir
      return redirectToSignin(req);
    }

    const itemId = params.id;
    const { text, rating } = await req.json();
    const clean = String(text ?? "").trim();
    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json({ ok: false, error: "invalid-rating" }, { status: 400 });
    }
    if (!clean && !score) {
      return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
    }
    if (clean.length > 1000) {
      return NextResponse.json({ ok: false, error: "too-long" }, { status: 400 });
    }

    // item var mı?
    const exists = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
    }

    // tek yorum kuralı: aynı item + aynı user için zaten yorum varsa 409
    const existing = await prisma.comment.findFirst({ where: { itemId, userId: me.id }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }
    // herkes (giriş yapmış) yorum atabilir
    const comment = await prisma.comment.create({
      data: { itemId, userId: me.id, text: clean, rating: score },
      include: { user: { select: { name: true, maskedName: true, avatarUrl: true, email: true } } },
    });

    return NextResponse.json({
      ok: true,
      comment: {
        id: comment.id,
        text: comment.text,
        rating: comment.rating,
        edited: !!comment.editedAt,
        user: {
          name: (comment.user as any)?.email === 'ratestuffnet@gmail.com'
            ? (comment.user?.name || 'Anonim')
            : (comment.user?.maskedName ?? (comment.user?.name ? maskName(comment.user.name) : 'Anonim')),
          avatarUrl: comment.user?.avatarUrl ?? null,
          verified: (comment.user as any)?.email === 'ratestuffnet@gmail.com',
        },
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ ok: false, error: "duplicate-comment" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}

// (opsiyonel) kendi yorumunu düzenleme
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getSessionUser();
    if (!me) {
      // ❗ Oturum yoksa 401 yerine signin'e yönlendir
      return redirectToSignin(req);
    }

    const { commentId, text, rating } = await req.json();
    const clean = String(text ?? "").trim();
    const score = Number(rating);
    if (!commentId || !Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json({ ok:false, error:"bad-request" }, { status:400 });
    }
    if (clean.length > 1000) {
      return NextResponse.json({ ok:false, error:"too-long" }, { status:400 });
    }

    // sahiplik kontrolü
    const c = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, itemId: true }
    });
    if (!c || c.itemId !== params.id) {
      return NextResponse.json({ ok:false, error:"not-found" }, { status:404 });
    }
    if (c.userId !== me.id) {
      return NextResponse.json({ ok:false, error:"forbidden" }, { status:403 });
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { text: clean, rating: score, editedAt: new Date() },
    });

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || "error" }, { status:400 });
  }
}
