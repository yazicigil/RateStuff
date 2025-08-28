"use client";
import { useEffect, useRef, useState } from "react";

type ItemLite = {
  id: string;
  name: string;
  imageUrl: string | null;
  createdAt: string;
  suspendedAt: string | null;
  _count: { reports: number };
  createdBy: { id: string; name: string | null };
};

export default function SuspendedItemsCard() {
  const [items, setItems] = useState<ItemLite[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    const res = await fetch(`/api/admin/items/suspended?${qs}`, { cache: "no-store" });
    const j = await res.json();
    setLoading(false);
    if (res.ok && j.ok) setItems(j.items as ItemLite[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // search debounce
  const tRef = useRef<number | null>(null);
  useEffect(() => {
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => load(), 300);
    return () => { if (tRef.current) window.clearTimeout(tRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const onToggle = async (it: ItemLite) => {
    const suspended = !!it.suspendedAt;
    const url = suspended
      ? `/api/admin/items/${it.id}/unsuspend`
      : `/api/admin/items/${it.id}/suspend`;

    setBusyId(it.id);
    const res = await fetch(url, { method: "POST" });

    if (res.ok) {
      if (suspended) {
        // Unsuspend: bu liste sadece askıdakileri gösteriyor; item'i listeden kaldır
        setItems(prev => prev.filter(x => x.id !== it.id));
      } else {
        // Suspend: listede zaten var; sadece suspendedAt'i güncelle
        const nowIso = new Date().toISOString();
        setItems(prev => prev.map(x => (x.id === it.id ? { ...x, suspendedAt: nowIso } : x)));
      }
    } else {
      // Başarısızlıkta listeyi tazele
      try { await load(); } catch (_) {}
    }
    setBusyId(null);
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 p-4 max-h-[520px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Askıdaki Gönderiler</h3>
        <div className="text-xs opacity-60">{items.length} kayıt</div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="İsim / Sahip ara..."
          className="w-full text-sm border rounded-md px-3 py-2 bg-white dark:bg-neutral-900"
        />
      </div>

      {/* List */}
      <div className="relative overflow-auto rounded-xl border flex-1">
        {loading ? (
          <div className="p-4 text-sm opacity-60">Yükleniyor…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm opacity-60">Askıda içerik bulunamadı.</div>
        ) : (
          <ul className="divide-y">
            {items.map(it => (
              <li key={it.id} className="p-3 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition relative">
                <div className="flex gap-3">
                  <img
                    src={it.imageUrl || "/badges/tag.svg"}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover border"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium truncate">{it.name}</h4>
                      {!!it.suspendedAt && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500 text-amber-700 dark:border-amber-400 dark:text-amber-300">
                          Askıda
                        </span>
                      )}
                      {it._count.reports >= 10 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500 text-red-600 dark:border-red-400 dark:text-red-300">
                          10+ Report
                        </span>
                      )}
                    </div>
                    <div className="text-xs opacity-70 mt-0.5">
                      Sahip: {it.createdBy?.name || "Bilinmiyor"} • Rapor: {it._count.reports} •
                      {" "}Oluşturuldu: {new Date(it.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions (bottom-right for consistency) */}
                  <div className="absolute right-3 bottom-3 flex gap-2">
                    <a
                      href={`/share/${it.id}`}
                      target="_blank"
                      className="inline-flex items-center text-[11px] h-7 px-2 rounded-md border bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition"
                    >
                      Git
                    </a>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}