import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers, cookies } from "next/headers";

function interpolate(tpl: string, data: Record<string, any>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = data?.[k];
    return v == null ? `{${k}}` : String(v);
  });
}

export const dynamic = "force-dynamic";

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("host") || process.env.VERCEL_URL || "localhost:3000";
  return `${proto}://${host}`;
}

async function requireAdmin(base: string) {
  try {
    const ck = cookies().toString();
    const ua = headers().get("user-agent") || "";
    const res = await fetch(`${base}/api/me`, {
      cache: "no-store",
      headers: { cookie: ck, "user-agent": ua },
    });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    const user = j?.user || j || null;
    return user?.isAdmin ? user : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const base = getBaseUrl();
  const admin = await requireAdmin(base);
  if (!admin) return NextResponse.json({ ok:false, error:"unauthorized" }, { status: 401 });

  const { type, userId, data, link, imageOverride } = await req.json().catch(() => ({}));
  if (!type) return NextResponse.json({ ok:false, error:"missing_type" }, { status: 400 });

  const targetUserId = userId || admin.id;
  if (!targetUserId) return NextResponse.json({ ok:false, error:"missing_user" }, { status: 400 });

  const tpl = await (prisma as any).notificationTemplate.findUnique({ where: { type } as any });
  if (!tpl) return NextResponse.json({ ok:false, error:"template_not_found" }, { status: 404 });

  const title = interpolate(tpl.title, data || {});
  const body  = interpolate(tpl.body,  data || {});
  const image = imageOverride ?? tpl.image ?? null;

  const n = await prisma.notification.create({
    data: {
      userId: targetUserId,
      type,
      title,
      body,
      image: image || undefined,
      link: link || undefined,
      data: data || undefined,
      eventKey: `admin_test:${type}:${Date.now()}`,
    }
  });

  return NextResponse.json({ ok:true, notification: n });
}