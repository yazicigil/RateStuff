// app/api/notifications/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Basit: Auth kontrolü yok. Kullanıcı sadece kendi UI'ında gördüğü bildirimi silebilsin yeter.

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }

    // Yoksa hata atmaması için deleteMany kullanıyoruz
    await prisma.notification.deleteMany({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/notifications/[id]/delete POST error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// İstersen DELETE methodu ile de çağrılabilsin
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  return POST(req, ctx);
}