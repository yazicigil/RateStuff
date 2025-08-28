// components/admin/StatsCard.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedRefresh from "@/components/common/AnimatedRefresh";
import refreshAnim from "@/assets/animations/refresh.json";

export type StatsTabs = "users" | "reports" | "suspended" | "allItems";
interface Props {
  activeTab: StatsTabs | null;
  onOpenTab: (t: StatsTabs) => void;
}

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

function StatsCard({ activeTab, onOpenTab }: Props) {
  // Filtreler
  const [start, setStart] = useState(addDaysYMD(todayYMD(), -13)); // varsayılan 14 gün
  const [end, setEnd] = useState(todayYMD());
  const [showSignups, setShowSignups] = useState(true);
  const [showItems, setShowItems] = useState(true);
  const [showComments, setShowComments] = useState(true);

  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<{ total: number; authed: number } | null>(null);

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

  useEffect(() => {
    let mounted = true;
    const loadPresence = async () => {
      try {
        const r = await fetch("/api/presence/counters", { cache: "no-store" });
        const j = await r.json();
        if (mounted && r.ok && j.ok) setOnline({ total: j.total, authed: j.authed });
      } catch {}
    };
    loadPresence();
    const id = setInterval(loadPresence, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

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
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Genel İstatistikler</h3>



  {/* Eski mask icon yerine: */}
  <AnimatedRefresh
    onClick={load}
    className="ml-1"
    size={16}
    animationData={refreshAnim}   // A seçeneği
    // path="/refresh.json"        // B seçeneği
  />



          <div className="ml-auto text-xs opacity-60">Güncelleme: {new Date(data.asOf).toLocaleString()}</div>
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
                aria-pressed={(end === todayYMD()) && (start === addDaysYMD(todayYMD(), -(p.days - 1))) }
                className={
                  ((end === todayYMD()) && (start === addDaysYMD(todayYMD(), -(p.days - 1))))
                    ? "px-2 py-1 text-xs font-medium bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }
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
        {/* Online (anlık) */}
        <div className="rounded-xl border p-3 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2 text-xs opacity-70">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Online (Anlık)</span>
          </div>
          <div className="text-2xl font-semibold flex items-baseline gap-2">
            {online ? online.total : "—"}
            <span className="text-[11px] font-normal opacity-70 flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
              {online ? `${online.authed} girişli` : "…"}
            </span>
          </div>
        </div>

        {/* Toplam Kullanıcı (clickable) */}
        <button
          onClick={() => onOpenTab("users")}
          aria-pressed={activeTab === "users"}
          className={`text-left rounded-xl border p-3 transition ${
            activeTab === "users"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
              : "bg-white dark:bg-neutral-900"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs opacity-70">
            {/* user icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"/>
            </svg>
            <span>Toplam Kullanıcı</span>
          </div>
          <div className="text-2xl font-semibold">{t.users}</div>
        </button>

        {/* Toplam Gönderi (clickable -> allItems) */}
        <button
          onClick={() => onOpenTab("allItems")}
          aria-pressed={activeTab === "allItems"}
          className={`text-left rounded-xl border p-3 transition ${
            activeTab === "allItems"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
              : "bg-white dark:bg-neutral-900"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs opacity-70">
            {/* quill icon colorized via mask */}
            <span
              aria-hidden
              className="h-4 w-4 inline-block align-[-2px]"
              style={{
                WebkitMaskImage: "url(/quill.svg)",
                maskImage: "url(/quill.svg)",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                backgroundColor: "currentColor",
              }}
            />
            <span>Toplam Gönderi</span>
          </div>
          <div className="text-2xl font-semibold">{t.items}</div>
        </button>

        {/* Toplam Yorum (static) */}
        <div className="rounded-xl border p-3 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-1.5 text-xs opacity-70">
            {/* comment icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M20 2H4a2 2 0 0 0-2 2v14l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
            </svg>
            <span>Toplam Yorum</span>
          </div>
          <div className="text-2xl font-semibold">{t.comments}</div>
        </div>

        {/* Toplam Rapor (clickable, red highlight) */}
        <button
          onClick={() => onOpenTab("reports")}
          aria-pressed={activeTab === "reports"}
          className={`text-left rounded-xl border p-3 transition ${
            activeTab === "reports"
              ? "bg-red-600 text-white dark:bg-red-500"
              : "bg-red-50/70 border-red-200/70 text-red-800 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs">
            {/* alert/triangle icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 3 1 21h22L12 3Zm1 14h-2v2h2v-2Zm0-8h-2v6h2V9Z"/>
            </svg>
            <span>Toplam Rapor</span>
          </div>
          <div className="text-2xl font-semibold">{t.reports}</div>
        </button>

        {/* Askıdaki Gönderi (clickable, amber highlight) */}
        <button
          onClick={() => onOpenTab("suspended")}
          aria-pressed={activeTab === "suspended"}
          className={`text-left rounded-xl border p-3 transition ${
            activeTab === "suspended"
              ? "bg-amber-500 text-black dark:text-black"
              : "bg-amber-50/70 border-amber-200/70 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/40 dark:text-amber-200"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs">
            {/* pause icon colorized via mask */}
            <span
              aria-hidden
              className="h-4 w-4 inline-block align-[-2px]"
              style={{
                WebkitMaskImage: "url(/pause.svg)",
                maskImage: "url(/pause.svg)",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                backgroundColor: "currentColor",
              }}
            />
            <span>Askıdaki Gönderi</span>
          </div>
          <div className="text-2xl font-semibold">{t.suspendedItems}</div>
        </button>
      </div>

      {/* Görünen serilerin toplamları */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mt-4">
        <Tile label={`Aktif Kullanıcı (${data.range.days}g)`} value={data.windowTotals.activeUsers} hint={`${data.range.start} → ${data.range.end}`} />
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