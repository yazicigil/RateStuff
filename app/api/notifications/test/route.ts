import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const n = await prisma.notification.create({
    data: {
      userId: me.id,
      type: "REPORT_OPENED" as any,
      title: "Test",
      body: "Bu bir test bildirimi",
      link: "/",
      eventKey: "dev:test:" + me.id + ":" + Date.now(), // uniq
    },
  });
  return NextResponse.json({ ok: true, id: n.id });
}