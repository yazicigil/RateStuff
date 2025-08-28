// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

type DayBucket = { date: string; count: number };

function ymd(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function addDays(d: Date, n: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

export async function GET() {
  const ok = await isAdmin();
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const since7 = addDays(now, -7);
  const since14 = addDays(now, -14);
  const since30 = addDays(now, -30);

  // Basit metrikler
  const [
    totalUsers,
    totalItems,
    totalComments,
    totalReports,
    suspendedItems,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.comment.count(),
    prisma.report.count(),
    prisma.item.count({ where: { suspendedAt: { not: null } } }),
  ]);

  // Son 7 günde aktif kullanıcı: item EKLEYEN veya comment YAZAN kullanıcıların distinct sayısı
  const [posters7, commenters7] = await Promise.all([
    prisma.item.findMany({
      where: { createdAt: { gte: since7 } },
      select: { createdById: true },
    }),
    prisma.comment.findMany({
      where: { createdAt: { gte: since7 } },
      select: { userId: true },
    }),
  ]);
  const activeSet = new Set<string>();
  posters7.forEach(p => p.createdById && activeSet.add(p.createdById));
  commenters7.forEach(c => c.userId && activeSet.add(c.userId));
  const activeUsers7 = activeSet.size;

  // Günlük bucket’lar (son 14 gün): kayıt, item, comment
  const [users14, items14, comments14] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
    prisma.item.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
  ]);

  // Tarihe göre grupla
  function bucketize(dates: { createdAt: Date }[], days = 14): DayBucket[] {
    const map = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      map.set(ymd(addDays(since14, i)), 0);
    }
    dates.forEach(r => {
      const key = ymd(r.createdAt);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }

  const dailySignups = bucketize(users14);
  const dailyNewItems = bucketize(items14);
  const dailyNewComments = bucketize(comments14);

  // Son 30 günde rapor sayısı
  const reports30 = await prisma.report.count({ where: { createdAt: { gte: since30 } } });

  return NextResponse.json({
    ok: true,
    totals: {
      users: totalUsers,
      items: totalItems,
      comments: totalComments,
      reports: totalReports,
      suspendedItems,
      activeUsers7,
      reports30,
    },
    series: {
      dailySignups,
      dailyNewItems,
      dailyNewComments,
    },
    asOf: now.toISOString(),
  });
}