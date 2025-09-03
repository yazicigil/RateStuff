import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { brandId, coverImageUrl, bio } = body;

    if (!brandId) {
      return NextResponse.json({ error: "brandId required" }, { status: 400 });
    }

    const updated = await prisma.brandAccount.update({
      where: { id: brandId },
      data: {
        coverImageUrl: coverImageUrl ?? null,
        bio: bio ?? null,
      },
    });

    return NextResponse.json({ ok: true, brand: updated });
  } catch (e) {
    console.error("PATCH /api/brand/profile error", e);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}