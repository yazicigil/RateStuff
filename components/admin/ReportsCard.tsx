"use client";
import { useEffect, useMemo, useState } from "react";

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

  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => it.name.toLowerCase().includes(s));
  }, [q, items]);

  const tallList = filtered.length > 6; // 6+ item varsa kaydır, yoksa kısa kalsın
  const tallDetails = active && details.reports && details.reports.length > 6; // detay çoksa kaydır

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

      <div className="flex gap-4">
        {/* Left side: list */}
        <div className="flex-1">
          {err && <div className="text-sm text-red-700 dark:text-red-300">{err}</div>}
          {loading && <div className="text-sm opacity-70">Yükleniyor…</div>}
          {!loading && !items.length && <div className="text-sm opacity-70">Raporlanan gönderi yok.</div>}

          {!loading && !!items.length && (
            <div className="mb-3">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Raporlanan gönderilerde ara…"
                  className="w-full h-9 rounded-md border px-8 pr-8 text-sm bg-white/80 dark:bg-neutral-900/80 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
                />
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="absolute left-2.5 top-2.5 h-4 w-4 opacity-60">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 103.89 9.39l3.11 3.1a1 1 0 001.41-1.41l-3.1-3.11A5.5 5.5 0 009 3.5zm-3.5 5.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z" clipRule="evenodd" />
                </svg>
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-2 text-xs opacity-70 hover:opacity-100"
                    aria-label="Temizle"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-1 text-xs opacity-70">{filtered.length} sonuç</div>
            </div>
          )}

          {!loading && !!items.length && filtered.length === 0 && (
            <div className="text-sm opacity-70 mb-2">Arama ile eşleşen sonuç yok.</div>
          )}

          <div className={`${tallList ? 'max-h-96 overflow-y-auto pr-1' : ''}`}>
            <ul className="divide-y divide-red-200/70 dark:divide-red-900/40">
              {filtered.map(it => (
                <li key={it.id}
                    className={`py-2 flex gap-3 items-center cursor-pointer rounded-lg px-2 hover:bg-white/40 dark:hover:bg-white/5 ${
                      (it._count?.reports ?? 0) >= 10 ? 'border border-red-300 bg-red-50/60 dark:border-red-900/40 dark:bg-red-900/20' : ''
                    }`}
                    onClick={() => openDetails(it.id)}>
                  {it.imageUrl
                    ? <img src={it.imageUrl} alt="" className="w-14 h-14 rounded object-cover" />
                    : <div className="w-14 h-14 rounded bg-neutral-200 dark:bg-neutral-800" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs opacity-70 flex items-center gap-2">
                      <span>{it._count.reports} report</span>
                      {!!it.suspendedAt && (
                        <span className="inline-flex items-center px-2 h-5 rounded border border-amber-300/60 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200">Askıda</span>
                      )}
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-60 ml-auto">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right side: details */}
        <div className={`w-1/2 rounded-xl border bg-white dark:bg-neutral-900 p-3 ${tallDetails ? 'max-h-96 overflow-y-auto' : ''}`}>
          {active ? (
            <>
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
                          <> • {details.item._count.comments} yorum</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/share/${details.item.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs h-8 px-3 rounded-md border bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M12.293 2.293a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L14 5.414V9a1 1 0 11-2 0V3a1 1 0 011-1h.707l-1.414 1.414 1-1.121z"/>
                          <path d="M5 4a3 3 0 00-3 3v7a3 3 0 003 3h7a3 3 0 003-3v-3a1 1 0 10-2 0v3a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 100-2H5z"/>
                        </svg>
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
                            // Success: update details + left list state to reflect new suspendedAt
                            const nextSusp = suspended ? null : new Date().toISOString();
                            setDetails((d) => (d.item ? ({ ...d, item: { ...d.item, suspendedAt: nextSusp } }) : d));
                            setItems((prev) => prev.map((it) => (it.id === id ? { ...it, suspendedAt: nextSusp } : it)));
                          } else {
                            // Failure: hard-refresh the details from API to ensure UI consistency
                            try {
                              const r = await fetch(`/api/admin/reports/${id}`, { cache: 'no-store' });
                              if (r.ok) {
                                const j = await r.json();
                                setDetails({ item: j.item, reports: j.reports });
                              }
                            } catch (_) {}
                          }
                        }}
                        className={`inline-flex items-center gap-1 text-xs h-8 px-3 rounded-md border transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 ${details.item?.suspendedAt ? 'border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                      >
                        {details.item?.suspendedAt ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6-3a1 1 0 012 0v6a1 1 0 11-2 0V7zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V7z" />
                            </svg>
                            Geri Aç
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 5.5a1 1 0 011.555-.832l4 2.5a1 1 0 010 1.664l-4 2.5A1 1 0 019 12.5v-5z" />
                            </svg>
                            Askıya Al
                          </>
                        )}
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
            </>
          ) : (
            <div className="text-sm opacity-50 italic">Bir gönderi seçin…</div>
          )}
        </div>
      </div>
    </div>
  );
}