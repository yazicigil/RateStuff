import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonUser } from "@/lib/anon";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { value } = await req.json();
    const v = Number(value);
    if (!v || v < 1 || v > 5) return NextResponse.json({ ok: false, error: "invalid rating" }, { status: 400 });

    const user = await getAnonUser();
    const itemId = params.id;

    // upsert rating
    await prisma.rating.upsert({
      where: { itemId_userId: { itemId, userId: user.id } },
      create: { itemId, userId: user.id, value: v },
      update: { value: v },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "error" }, { status: 400 });
  }
}
