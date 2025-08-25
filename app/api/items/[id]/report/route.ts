import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendAdminEmail } from "@/lib/adminEmail";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const itemId = params.id;
    const body = await req.json().catch(() => ({} as any));
    const reason = (body?.reason ?? "").toString().trim();
    if (!reason) {
      return NextResponse.json({ ok: false, error: "Reason required" }, { status: 400 });
    }

    // Ensure item exists (for email/context)
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, description: true },
    });
    if (!item) return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });

    // Load user email for notification (getSessionUser() type doesn't include email)
    const userDb = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true },
    });

    // Same user reporting the same item: update reason; else create
    await prisma.report.upsert({
      where: { itemId_userId: { itemId, userId: user.id } },
      create: { itemId, userId: user.id, reportdesc: reason },
      update: { reportdesc: reason },
    });

    const count = await prisma.report.count({ where: { itemId } });

    // Fire-and-forget admin email (best-effort)
    try {
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#111">
          <h2>Yeni Rapor</h2>
          <p><strong>Item:</strong> ${escapeHtml(item.name || "(adsız)")} <small>(${item.id})</small></p>
          <p><strong>Kullanıcı:</strong> ${escapeHtml(userDb?.name || user.name || "(isim yok)")} &lt;${escapeHtml(userDb?.email || "-")}&gt;</p>
          <p><strong>Sebep:</strong><br/>${escapeHtml(reason)}</p>
          <p style="color:#666"><small>Toplam rapor: ${count}</small></p>
        </div>`;
      await sendAdminEmail("reports@ratestuff.net", `Rapor: ${item.name || item.id}`, html);
    } catch (e) {
      console.error("[report email]", e);
    }

    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
