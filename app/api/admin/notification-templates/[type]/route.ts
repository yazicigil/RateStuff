import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers, cookies } from "next/headers";

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

export async function PATCH(
  _req: Request,
  { params }: { params: { type: string } }
) {
  const base = getBaseUrl();
  const admin = await requireAdmin(base);
  if (!admin) return NextResponse.json({ ok:false, error:"unauthorized" }, { status: 401 });

  const { title, body, image } = await _req.json().catch(() => ({}));
  if (!title || !body) return NextResponse.json({ ok:false, error:"missing_fields" }, { status: 400 });

  const updated = await (prisma as any).notificationTemplate.upsert({
    where: { type: params.type as any },
    create: { type: params.type as any, title, body, image },
    update: { title, body, image, updatedAt: new Date() },
  });

  return NextResponse.json({ ok:true, template: updated });
}