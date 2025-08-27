"use client";
import { useEffect, useState } from "react";

type ReportedItem = {
  id: string; name: string; imageUrl: string|null;
  suspendedAt: string | null;
  _count: { reports: number };
};
type Report = {
  id: string;
  createdAt: string;
  // API returns all fields; reason may be `reason` or another field name.
  // We'll keep it loose and access safely at render time.
  user: { id: string; name: string | null; email: string | null };
  [key: string]: any;
};

export default function ReportsCard() {
  const [items, setItems] = useState<ReportedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [active, setActive] = useState<string|null>(null);
  const [details, setDetails] = useState<{ item?: { id: string; name: string; imageUrl?: string | null; suspendedAt?: string | null; createdBy?: { id: string; name: string | null; email: string | null } | null; _count?: { comments: number } }; reports: Report[] }>({ reports: [] });
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
    if (active === itemId) {
      // toggle close
      setActive(null);
      setDetails({ reports: [] });
      return;
    }
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
              className={`py-2 flex gap-3 items-center cursor-pointer rounded-lg px-2 hover:bg-white/40 dark:hover:bg-white/5 ${
                (it._count?.reports ?? 0) >= 10 ? 'border border-red-300 bg-red-50/60 dark:border-red-900/40 dark:bg-red-900/20' : ''
              }`}
              onClick={() => openDetails(it.id)}>
            {/* görsel */}
            {it.imageUrl
              ? <img src={it.imageUrl} alt="" className="w-14 h-14 rounded object-cover" />
              : <div className="w-14 h-14 rounded bg-neutral-200 dark:bg-neutral-800" />
            }
            <div className="flex-1 min-w-0">
              <div className="font-medium">{it.name}</div>
              <div className="text-xs opacity-70 flex items-center gap-2">
                <span>{it._count.reports} report</span>
                {it.suspendedAt && (
                  <span className="inline-flex items-center px-2 h-5 rounded border border-amber-300/60 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200">Askıda</span>
                )}
              </div>
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
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {details.item.name}
                    {details.item.suspendedAt && (
                      <span className="inline-flex items-center px-2 h-5 rounded border border-amber-300/60 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200 text-xs">Askıda</span>
                    )}
                  </div>
                  <div className="text-xs opacity-70">
                    {details.item.createdBy?.name || details.item.createdBy?.email || "Bilinmiyor"}
                    {typeof details.item._count?.comments === "number" && (
                      <>
                        {" \u2022 "}{details.item._count.comments} yorum
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/share/${details.item.id}`} target="_blank"
                     className="text-xs px-2 h-7 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    Gönderiye git
                  </a>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!details.item) return;
                      const id = details.item.id;
                      const suspended = !!details.item.suspendedAt;
                      const url = suspended ? `/api/admin/items/${id}/unsuspend` : `/api/admin/items/${id}/suspend`;
                      const res = await fetch(url, { method: 'POST' });
                      if (res.ok) {
                        setDetails(d => d.item ? ({ ...d, item: { ...d.item, suspendedAt: suspended ? null : new Date().toISOString() } }) : d);
                        setItems(prev => prev.map(it => it.id === id ? { ...it, suspendedAt: suspended ? null : new Date().toISOString() } : it));
                      }
                    }}
                    className={`text-xs px-2 h-7 rounded-md border ${details.item?.suspendedAt ? 'border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                  >
                    {details.item?.suspendedAt ? 'Geri Aç' : 'Askıya Al'}
                  </button>
                </div>
              </div>
              <ul className="space-y-2">
                {details.reports.map(r => (
                  <li key={r.id} className="rounded-lg border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.user.name || r.user.email || r.user.id}</div>
                      <time className="text-xs opacity-70">{new Date(r.createdAt).toLocaleString()}</time>
                    </div>
                    {(() => {
                      const reason = r.reportdesc ?? r.reason ?? r.description ?? r.note ?? r.details ?? null;
                      return reason ? <div className="mt-1 text-sm">{String(reason)}</div> : null;
                    })()}
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