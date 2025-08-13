import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
// NOTE: Prisma client henüz CommentVote modelini tip olarak üretmediyse TS uyarısı vermesin diye 'as any' cast kullanıyoruz. Deploy'da prisma generate sonrası kaldırılabilir.

// Body: { value: 1 | -1 | 0 }   (0 = oyu kaldır)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { value } = (await req.json().catch(() => ({}))) as { value?: number };
    if (value !== 1 && value !== -1 && value !== 0) {
      return NextResponse.json({ ok: false, error: "Invalid vote value" }, { status: 400 });
    }

    const commentId = params.id;

    // Prevent self-vote
    const owner = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });
    if (owner?.userId === me.id) {
      return NextResponse.json({ ok: false, error: 'cannot-self-vote' }, { status: 400 });
    }

    if (value === 0) {
      // Oy kaldır
      await (prisma as any).commentVote.deleteMany({ where: { commentId, userId: me.id } });
    } else {
      // Oy ver/güncelle
      await (prisma as any).commentVote.upsert({
        where: { commentId_userId: { commentId, userId: me.id } },
        update: { value },
        create: { commentId, userId: me.id, value },
      });
    }

    // Toplam skor
    const agg = await (prisma as any).commentVote.aggregate({
      where: { commentId },
      _sum: { value: true },
    });

    const myVoteRow = await (prisma as any).commentVote.findUnique({
      where: { commentId_userId: { commentId, userId: me.id } },
      select: { value: true },
    });

    return NextResponse.json({
      ok: true,
      score: agg._sum.value ?? 0,
      myVote: myVoteRow?.value ?? 0,
    });
  } catch (e: any) {
    console.error("[vote] error:", e?.message ?? e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}