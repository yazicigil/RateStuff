"use client";
import { useEffect, useRef, useState } from "react";

type ItemLite = {
  id: string;
  name: string;
  imageUrl: string | null;
  createdAt: string;
  suspendedAt: string | null;
  _count: { comments: number; reports: number };
  createdBy: { id: string; name: string | null };
};

export default function AllItemsCard() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ItemLite[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showId, setShowId] = useState(true);

  async function load(opts?: { append?: boolean; cursor?: string | null }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (opts?.cursor) params.set("cursor", opts.cursor);
    params.set("limit", "30");

    setLoading(true);
    const res = await fetch(`/api/admin/items/all?${params}`, { cache: "no-store" });
    const j = await res.json();
    setLoading(false);
    if (!res.ok || !j.ok) return;

    if (opts?.append) setItems(prev => [...prev, ...j.items]);
    else setItems(j.items);
    setCursor(j.nextCursor || null);
    setHasMore(!!j.nextCursor);
  }

  useEffect(() => { load(); }, []);
  // debounce search
  const tRef = useRef<number | null>(null);
  useEffect(() => {
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => load(), 300);
    return () => { if (tRef.current) window.clearTimeout(tRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const onToggle = async (it: ItemLite) => {
    const suspended = !!it.suspendedAt;
    const url = suspended ? `/api/admin/items/${it.id}/unsuspend` : `/api/admin/items/${it.id}/suspend`;
    setBusyId(it.id);
    const res = await fetch(url, { method: "POST" });
    setBusyId(null);
    if (res.ok) {
      const nextSusp = suspended ? null : new Date().toISOString();
      setItems(prev => prev.map(x => x.id === it.id ? { ...x, suspendedAt: nextSusp } : x));
    } else {
      await load();
    }
  };

  return (
    <div className="rounded-2xl border p-4 max-h-[520px] bg-white dark:bg-neutral-900 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Tüm Gönderiler</h3>
        <div className="text-xs opacity-60">{items.length} kayıt</div>
      </div>

      <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
        <input
          className="border rounded-md px-3 py-2 bg-transparent"
          placeholder="İsim / Kullanıcı ara..."
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
        <button onClick={() => load()} className="px-3 rounded-md border text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
          Yenile
        </button>
        <label className="flex items-center gap-2 text-xs opacity-80 select-none">
          <input type="checkbox" className="accent-current" checked={showId} onChange={(e)=>setShowId(e.target.checked)} />
          ID sütunu
        </label>
      </div>

      <div className="relative overflow-auto rounded-xl border divide-y">
        <div className={`grid ${showId ? 'grid-cols-[180px_1fr_auto]' : 'grid-cols-[1fr_auto]'} gap-3 px-3 py-2 text-[11px] font-medium opacity-70 sticky top-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur`}>
          {showId && <div>Item ID</div>}
          <div>Başlık &amp; Sahip • Yorum/Report</div>
          <div className="text-right">Aksiyon</div>
        </div>

        {items.map(it => (
          <div key={it.id} className={`grid ${showId ? 'grid-cols-[180px_1fr_auto]' : 'grid-cols-[1fr_auto]'} gap-3 px-3 py-3 items-center`}>
            {showId && (
              <div className="font-mono text-[11px] truncate" title={it.id}>{it.id}</div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <img src={it.imageUrl || "/badges/tag.svg"} alt="" className="h-10 w-10 rounded object-cover border" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <a href={`/share/${it.id}`} target="_blank" className="text-sm font-medium truncate hover:underline">{it.name}</a>
                    {it.suspendedAt && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500 text-amber-700 dark:border-amber-400 dark:text-amber-300">
                        Askıda
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-70 truncate">
                    Sahip: {it.createdBy?.name || "Bilinmiyor"} • Yorum: {it._count.comments} • Report: {it._count.reports} • Oluşturuldu: {new Date(it.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <a
                href={`/share/${it.id}`}
                target="_blank"
                className="inline-flex items-center text-[11px] h-7 px-2 rounded-md border bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition"
              >Git</a>
              <button
                type="button"
                disabled={busyId === it.id}
                onClick={() => onToggle(it)}
                className={`inline-flex items-center text-[11px] h-7 px-2 rounded-md border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  it.suspendedAt
                    ? "border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    : "border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                }`}
              >
                {it.suspendedAt ? "Geri Aç" : "Askıya Al"}
              </button>
            </div>
          </div>
        ))}

        <div className="p-3">
          {hasMore ? (
            <button
              onClick={() => load({ append: true, cursor })}
              className="w-full text-sm border rounded-md py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              disabled={loading}
            >{loading ? "Yükleniyor…" : "Daha Fazla"}</button>
          ) : (
            <div className="text-xs opacity-50 text-center">Hepsi bu kadar</div>
          )}
        </div>
      </div>
    </div>
  );
}