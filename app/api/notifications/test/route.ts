// app/api/notifications/test/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const n = await prisma.notification.create({
    data: {
      userId: me.id,
      type: "REPORT_OPENED" as any,
      title: "Test bildirimi",
      body: `Merhaba ${me.name ?? "kullanıcı"}`,
      link: "/",
      eventKey: `test:${me.id}:${Date.now()}`
    },
  });

  return NextResponse.json({ ok: true, id: n.id });
}