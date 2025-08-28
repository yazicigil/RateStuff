// components/admin/StatsCard.tsx
"use client";
import { useEffect, useState } from "react";

type DayBucket = { date: string; count: number };
type Stats = {
  ok: boolean;
  totals: {
    users: number;
    items: number;
    comments: number;
    reports: number;
    suspendedItems: number;
    activeUsers7: number;
    reports30: number;
  };
  series: {
    dailySignups: DayBucket[];
    dailyNewItems: DayBucket[];
    dailyNewComments: DayBucket[];
  };
  asOf: string;
};

export default function StatsCard() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const j = await res.json();
      setLoading(false);
      if (res.ok && j.ok) setData(j);
    })();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border p-4 bg-white dark:bg-neutral-900 animate-pulse">
        <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded mb-4" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
              <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;
  const t = data.totals;

  const Tile = ({
    label,
    value,
    hint,
    danger,
  }: { label: string; value: number | string; hint?: string; danger?: boolean }) => (
    <div className={`rounded-xl border p-3 ${danger ? "bg-red-50/60 dark:bg-red-900/20 border-red-200/70 dark:border-red-900/40" : "bg-white dark:bg-neutral-900"}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-[11px] opacity-60">{hint}</div>}
    </div>
  );

  return (
    <div className="rounded-2xl border p-4 bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Genel İstatistikler</h3>
        <div className="text-xs opacity-60">Güncelleme: {new Date(data.asOf).toLocaleString()}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="Toplam Kullanıcı" value={t.users} />
        <Tile label="Toplam Gönderi" value={t.items} />
        <Tile label="Toplam Yorum" value={t.comments} />
        <Tile label="Toplam Rapor" value={t.reports} />
        <Tile label="Askıdaki Gönderi" value={t.suspendedItems} danger />
        <Tile label="Aktif Kullanıcı (7g)" value={t.activeUsers7} hint="Son 7 gün içinde paylaşım / yorum" />
      </div>

      {/* Mini seriler: sade sayısal özet */}
      <div className="grid gap-3 md:grid-cols-3 mt-4">
        <Tile
          label="Günlük Kayıt (14g)"
          value={data.series.dailySignups.reduce((a, b) => a + b.count, 0)}
          hint="Son 14 gün toplamı"
        />
        <Tile
          label="Günlük Yeni Gönderi (14g)"
          value={data.series.dailyNewItems.reduce((a, b) => a + b.count, 0)}
          hint="Son 14 gün toplamı"
        />
        <Tile
          label="Günlük Yeni Yorum (14g)"
          value={data.series.dailyNewComments.reduce((a, b) => a + b.count, 0)}
          hint="Son 14 gün toplamı"
        />
      </div>
    </div>
  );
}