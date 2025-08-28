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
function diffDays(a: Date, b: Date) {
  const MS = 1000 * 60 * 60 * 24;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((db.getTime() - da.getTime()) / MS));
}

export async function GET(req: Request) {
  const ok = await isAdmin();
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const startStr = url.searchParams.get("start"); // YYYY-MM-DD
  const endStr = url.searchParams.get("end");   // YYYY-MM-DD

  const now = new Date();
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const defaultStart = addDays(defaultEnd, -13); // 14 günlük pencere varsayılan

  const start = startStr ? new Date(startStr + "T00:00:00.000Z") : defaultStart;
  const end = endStr ? new Date(endStr + "T00:00:00.000Z") : defaultEnd;

  // güvenlik: start > end ise swap
  let rangeStart = start;
  let rangeEnd = end;
  if (rangeStart > rangeEnd) {
    const tmp = rangeStart; rangeStart = rangeEnd; rangeEnd = tmp;
  }

  const days = diffDays(rangeStart, rangeEnd) + 1; // inclusive

  // Basit metrikler (tümü)
  const [totalUsers, totalItems, totalComments, totalReports, suspendedItems] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.comment.count(),
    prisma.report.count(),
    prisma.item.count({ where: { suspendedAt: { not: null } } }),
  ]);

  // Pencere içi metrikler
  const windowWhere = { gte: rangeStart, lte: addDays(rangeEnd, 1) } as const; // lte end-of-day için +1

  const [usersInRange, itemsInRange, commentsInRange, reportsInRange] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } } }),
    prisma.item.count({ where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } } }),
    prisma.comment.count({ where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } } }),
    prisma.report.count({ where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } } }),
  ]);

  // Aktif kullanıcı: bu aralıkta item ekleyen veya yorum yazan distinct kullanıcı sayısı
  const [postersRange, commentersRange] = await Promise.all([
    prisma.item.findMany({ where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } }, select: { createdById: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } }, select: { userId: true } }),
  ]);
  const activeSet = new Set<string>();
  postersRange.forEach(p => p.createdById && activeSet.add(p.createdById));
  commentersRange.forEach(c => c.userId && activeSet.add(c.userId));
  const activeUsers = activeSet.size;

  // Günlük bucket’lar: kayıt, item, comment (seçilen aralık)
  const [usersDates, itemsDates, commentsDates] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } }, select: { createdAt: true } }),
    prisma.item.findMany({ where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } }, select: { createdAt: true } }),
  ]);

  function bucketize(dates: { createdAt: Date }[], start: Date, days: number): DayBucket[] {
    const map = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      map.set(ymd(addDays(start, i)), 0);
    }
    dates.forEach(r => {
      const key = ymd(r.createdAt);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }

  const dailySignups = bucketize(usersDates, rangeStart, days);
  const dailyNewItems = bucketize(itemsDates, rangeStart, days);
  const dailyNewComments = bucketize(commentsDates, rangeStart, days);

  return NextResponse.json({
    ok: true,
    range: { start: ymd(rangeStart), end: ymd(rangeEnd), days },
    totals: {
      users: totalUsers,
      items: totalItems,
      comments: totalComments,
      reports: totalReports,
      suspendedItems,
      activeUsers,
    },
    windowTotals: {
      users: usersInRange,
      items: itemsInRange,
      comments: commentsInRange,
      reports: reportsInRange,
      activeUsers,
    },
    series: {
      dailySignups,
      dailyNewItems,
      dailyNewComments,
    },
    asOf: now.toISOString(),
  });
}