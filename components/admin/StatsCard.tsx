// components/admin/StatsCard.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type DayBucket = { date: string; count: number };

type Stats = {
  ok: boolean;
  range: { start: string; end: string; days: number };
  totals: {
    users: number;
    items: number;
    comments: number;
    reports: number;
    suspendedItems: number;
    activeUsers: number; // seçilen aralıkta paylaşım/yorum yapan distinct kullanıcı
  };
  windowTotals: {
    users: number;
    items: number;
    comments: number;
    reports: number;
    activeUsers: number;
  };
  series: {
    dailySignups: DayBucket[];
    dailyNewItems: DayBucket[];
    dailyNewComments: DayBucket[];
  };
  asOf: string;
};

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysYMD(ymd: string, delta: number) {
  const d = new Date(ymd + "T00:00:00.000Z");
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function StatsCard() {
  // Filtreler
  const [start, setStart] = useState(addDaysYMD(todayYMD(), -13)); // varsayılan 14 gün
  const [end, setEnd] = useState(todayYMD());
  const [showSignups, setShowSignups] = useState(true);
  const [showItems, setShowItems] = useState(true);
  const [showComments, setShowComments] = useState(true);

  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({ start, end }).toString();
    const res = await fetch(`/api/admin/stats?${qs}`, { cache: "no-store" });
    const j = await res.json();
    setLoading(false);
    if (res.ok && j.ok) setData(j);
  }

  // initial load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tarih değişiminde debounce ile otomatik yükle
  const tRef = useRef<number | null>(null);
  useEffect(() => {
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => load(), 300);
    return () => { if (tRef.current) window.clearTimeout(tRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  const seriesTotals = useMemo(() => {
    if (!data) return { signups: 0, items: 0, comments: 0 };
    return {
      signups: data.series.dailySignups.reduce((a, b) => a + b.count, 0),
      items: data.series.dailyNewItems.reduce((a, b) => a + b.count, 0),
      comments: data.series.dailyNewComments.reduce((a, b) => a + b.count, 0),
    };
  }, [data]);

  if (loading && !data) {
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
      {/* Header + Filters */}
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Genel İstatistikler</h3>
          <div className="text-xs opacity-60">Güncelleme: {new Date(data.asOf).toLocaleString()}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick presets */}
          <div className="inline-flex rounded-md border overflow-hidden">
            {[
              { label: "7g", days: 7 },
              { label: "14g", days: 14 },
              { label: "30g", days: 30 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  const newEnd = todayYMD();
                  const newStart = addDaysYMD(newEnd, -(p.days - 1));
                  setStart(newStart);
                  setEnd(newEnd);
                }}
                className="px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date pickers */}
          <div className="flex items-center gap-2 text-xs">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-2 py-1 bg-white dark:bg-neutral-900" />
            <span>→</span>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-2 py-1 bg-white dark:bg-neutral-900" />
          </div>

          {/* Series filters */}
          <div className="flex items-center gap-3 text-xs ml-auto">
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={showSignups} onChange={(e) => setShowSignups(e.target.checked)} />
              Kayıtlar
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={showItems} onChange={(e) => setShowItems(e.target.checked)} />
              Gönderiler
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={showComments} onChange={(e) => setShowComments(e.target.checked)} />
              Yorumlar
            </label>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="Toplam Kullanıcı" value={t.users} />
        <Tile label="Toplam Gönderi" value={t.items} />
        <Tile label="Toplam Yorum" value={t.comments} />
        <Tile label="Toplam Rapor" value={t.reports} />
        <Tile label="Askıdaki Gönderi" value={t.suspendedItems} danger />
        <Tile label={`Aktif Kullanıcı (${data.range.days}g)`} value={t.activeUsers} hint={`${data.range.start} → ${data.range.end}`} />
      </div>

      {/* Görünen serilerin toplamları */}
      <div className="grid gap-3 md:grid-cols-3 mt-4">
        {showSignups && (
          <Tile label={`Kayıt (${data.range.days}g)`} value={seriesTotals.signups} hint={`${data.range.start} → ${data.range.end}`} />
        )}
        {showItems && (
          <Tile label={`Yeni Gönderi (${data.range.days}g)`} value={seriesTotals.items} hint={`${data.range.start} → ${data.range.end}`} />
        )}
        {showComments && (
          <Tile label={`Yeni Yorum (${data.range.days}g)`} value={seriesTotals.comments} hint={`${data.range.start} → ${data.range.end}`} />
        )}
      </div>
    </div>
  );
}

export default StatsCard;