// app/api/items/[id]/rate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser();

    // ❗ Oturum yoksa: NextAuth signin'e yönlendir
    if (!me) {
      const url = new URL(req.url);
      const referer = req.headers.get("referer");
      const signin = new URL("/api/auth/signin", url.origin);
      // geri dönüşü, geldiği sayfaya ayarla (yoksa ana sayfa)
      signin.searchParams.set("callbackUrl", referer ?? `${url.origin}/`);
      return NextResponse.redirect(signin);
    }

    const body = await req.json().catch(() => ({}));
    const v = Number((body as any).value);
    if (!v || v < 1 || v > 5) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    }

    await prisma.rating.upsert({
      where: { itemId_userId: { itemId: params.id, userId: me.id } },
      create: { itemId: params.id, userId: me.id, value: v },
      update: { value: v, editedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 400 });
  }
}
