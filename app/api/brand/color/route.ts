import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const HEX = /^#([0-9a-fA-F]{6})$/;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const brand = await prisma.brandAccount.findUnique({
    where: { email: session.user.email },
    select: { cardColor: true },
  });

  return NextResponse.json({ ok: true, color: brand?.cardColor ?? null });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const raw = body?.color;

  // reset (null) de destekle
  if (raw === null || raw === "" || typeof raw === "undefined") {
    await prisma.brandAccount.update({
      where: { email: session.user.email },
      data: { cardColor: null },
    });
    return NextResponse.json({ ok: true, color: null });
  }

  if (typeof raw !== "string" || !HEX.test(raw)) {
    return NextResponse.json({ ok: false, error: "invalid_color" }, { status: 400 });
  }

  const color = raw.toUpperCase(); // normalize: #RRGGBB

  await prisma.brandAccount.update({
    where: { email: session.user.email },
    data: { cardColor: color },
  });

  return NextResponse.json({ ok: true, color });
}