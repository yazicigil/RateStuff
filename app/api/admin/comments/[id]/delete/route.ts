

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  }

  try {
    await prisma.comment.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete comment", err);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}