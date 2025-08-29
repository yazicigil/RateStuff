

import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// NOTE: Next.js dinamik segmentler köşeli parantez ile çalışır: [id]
// Bu dosyayı /app/api/notifications/[id]/delete/route.ts yoluna taşırsan route aktif olur.

async function requireUser() {
  // /api/me kullanarak kimlik doğrulama (mevcut projeyle uyumlu)
  const hdrs = headers();
  const base = hdrs.get("x-forwarded-host")
    ? `${hdrs.get("x-forwarded-proto") || "https"}://${hdrs.get("x-forwarded-host")}`
    : `${hdrs.get("x-forwarded-proto") || "http"}://${hdrs.get("host")}`;

  const res = await fetch(`${base}/api/me`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const me = await res.json();
  if (!me?.id) return null;
  return me as { id: string; isAdmin?: boolean };
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }

    // Sadece bildirimin sahibinin silmesine izin ver.
    const deleted = await prisma.notification.deleteMany({
      where: { id, userId: me.id },
    });

    if (deleted.count === 0) {
      // Bildirim bulunamadı veya size ait değil
      return NextResponse.json({ ok: false, error: "not_found_or_forbidden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/notifications/[id]/delete POST error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export const runtime = "edge";