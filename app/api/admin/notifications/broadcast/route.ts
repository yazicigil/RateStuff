import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { title, body, image, link, scheduledAt } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // If scheduledAt provided and in the future -> save to scheduled_broadcasts table
    if (scheduledAt) {
      const when = new Date(scheduledAt);
      const now = new Date();
      if (isNaN(when.getTime())) {
        return NextResponse.json({ ok: false, error: "invalid_schedule" }, { status: 400 });
      }
      if (when.getTime() <= now.getTime() + 30 * 1000) {
        // within 30s, treat as immediate send
      } else {
        // raw SQL to avoid prisma schema migration
        await prisma.$executeRawUnsafe(
          `insert into scheduled_broadcasts (title, body, image, link, scheduled_at) values ($1, $2, $3, $4, $5)`,
          title,
          body,
          image || null,
          link || null,
          when.toISOString()
        );
        return NextResponse.json({ ok: true, scheduled: true, scheduledAt: when.toISOString() });
      }
    }

    // Tüm kullanıcılar
    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length === 0) return NextResponse.json({ ok: true, created: 0 });

    // Enum’a yeni değer eklemek istemiyorsan şimdilik "MILESTONE_REACHED" kullanıyoruz.
    // İleride enum’a ADMIN_BROADCAST ekleriz.
    const rows = users.map(u => ({
      userId: u.id,
      type: "ADMIN_BROADCAST" as any, // TODO: enum'a 'ADMIN_BROADCAST' ekle
      title,
      body,
      image: image || null,
      link: link || null,
      data: { kind: "broadcast", link, image },
      eventKey: null,
    }));

    const r = await prisma.notification.createMany({ data: rows });
    return NextResponse.json({ ok: true, created: r.count });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status });
  }
}

export async function GET() {
  try {
    await requireAdmin(); // or protect with a secret later if cron will call it

    // fetch due jobs
    const rows: Array<{ id: string; title: string; body: string; image: string | null; link: string | null; scheduled_at: string }>
      = await prisma.$queryRawUnsafe(`select id, title, body, image, link, scheduled_at from scheduled_broadcasts where status = 'pending' and scheduled_at <= now() order by scheduled_at asc limit 20`);

    if (rows.length === 0) return NextResponse.json({ ok: true, dispatched: 0 });

    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length === 0) return NextResponse.json({ ok: true, dispatched: 0 });

    for (const job of rows) {
      const batch = users.map(u => ({
        userId: u.id,
        type: "ADMIN_BROADCAST" as any,
        title: job.title,
        body: job.body,
        image: job.image,
        link: job.link,
        data: { kind: "broadcast", link: job.link, image: job.image, scheduledAt: job.scheduled_at },
        eventKey: null,
      }));
      await prisma.notification.createMany({ data: batch });
      await prisma.$executeRawUnsafe(`update scheduled_broadcasts set status = 'sent', sent_at = now() where id = $1`, job.id);
    }

    return NextResponse.json({ ok: true, dispatched: rows.length });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status });
  }
}