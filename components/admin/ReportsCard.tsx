"use client";
import { useEffect, useState } from "react";

type ReportedItem = {
  id: string; name: string; imageUrl: string|null;
  _count: { reports: number };
};
type Report = {
  id: string; reason: string|null; createdAt: string;
  user: { id: string; name: string|null; email: string|null };
};

export default function ReportsCard() {
  const [items, setItems] = useState<ReportedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [active, setActive] = useState<string|null>(null);
  const [details, setDetails] = useState<{ item?: any; reports: Report[] }>({ reports: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/reports/list", { cache: "no-store" });
      const j = await res.json();
      setLoading(false);
      if (res.ok && j.ok) setItems(j.items as ReportedItem[]);
      else setErr(j.error || "Hata");
    })();
  }, []);

  async function openDetails(itemId: string) {
    setActive(itemId);
    setLoadingDetails(true);
    const res = await fetch(`/api/admin/reports/${itemId}`, { cache: "no-store" });
    const j = await res.json();
    setLoadingDetails(false);
    if (res.ok && j.ok) setDetails({ item: j.item, reports: j.reports });
  }

  return (
    <div className="rounded-2xl border p-4 bg-red-50/60 dark:bg-red-900/20 dark:border-red-900/40">
      <h3 className="text-base font-semibold mb-3">Raporlanan Gönderiler</h3>

      {err && <div className="text-sm text-red-700 dark:text-red-300">{err}</div>}
      {loading && <div className="text-sm opacity-70">Yükleniyor…</div>}

      {!loading && !items.length && <div className="text-sm opacity-70">Raporlanan gönderi yok.</div>}

      <ul className="divide-y divide-red-200/70 dark:divide-red-900/40">
        {items.map(it => (
          <li key={it.id}
              className="py-2 flex gap-3 items-center cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 rounded-lg px-2"
              onClick={() => openDetails(it.id)}>
            {/* görsel */}
            {it.imageUrl
              ? <img src={it.imageUrl} alt="" className="w-14 h-14 rounded object-cover" />
              : <div className="w-14 h-14 rounded bg-neutral-200 dark:bg-neutral-800" />
            }
            <div className="flex-1 min-w-0">
              <div className="font-medium">{it.name}</div>
              <div className="text-xs opacity-70">{it._count.reports} report</div>
            </div>
            <button className="text-xs px-2 h-7 rounded-md border">Detay</button>
          </li>
        ))}
      </ul>

      {/* Detay paneli */}
      {active && (
        <div className="mt-4 rounded-xl border bg-white dark:bg-neutral-900 p-3">
          {loadingDetails && <div className="text-sm opacity-70">Detaylar yükleniyor…</div>}
          {!!details.item && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{details.item.name}</div>
                <a href={`/share/${details.item.id}`} target="_blank"
                   className="text-xs px-2 h-7 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  Gönderiye git
                </a>
              </div>
              <ul className="space-y-2">
                {details.reports.map(r => (
                  <li key={r.id} className="rounded-lg border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.user.name || r.user.email || r.user.id}</div>
                      <time className="text-xs opacity-70">{new Date(r.createdAt).toLocaleString()}</time>
                    </div>
                    {r.reason && <div className="mt-1 text-sm">{r.reason}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}