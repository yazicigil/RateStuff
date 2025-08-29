// app/api/notifications/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function cookieHeader() {
  // Tüm çerezleri "name=value; name2=value2" formatına çevir
  const all = cookies().getAll();
  return all.map(c => `${c.name}=${c.value}`).join("; ");
}

async function requireUser(req: Request) {
  try {
    const meUrl = new URL("/api/me", req.url);
    const res = await fetch(meUrl, {
      headers: { cookie: cookieHeader() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const me = await res.json();
    if (!me?.id) return null;
    return me as { id: string; isAdmin?: boolean };
  } catch (e) {
    console.error("requireUser failed", e);
    return null;
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireUser(req);
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }

    const deleted = await prisma.notification.deleteMany({
      where: { id, userId: me.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ ok: false, error: "not_found_or_forbidden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/notifications/[id]/delete POST error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}