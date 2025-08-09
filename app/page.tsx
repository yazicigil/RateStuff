'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Tag from "@/components/Tag";
import Stars from "@/components/Stars";
import Pill from "@/components/Pill";

type ItemVM = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  avg: number | null;
  count: number;
  edited?: boolean; // ← eklendi
  createdBy?: { id: string; name: string; avatarUrl?: string | null } | null; // ← eklendi
  comments: { id: string; text: string; edited?: boolean; user?: { name?: string | null; avatarUrl?: string | null } }[];
  tags: string[];
};

export default function HomePage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<"new"|"top">("new");
  const [items, setItems] = useState<ItemVM[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const [itemsRes, tagsRes, trendRes] = await Promise.all([
      fetch(`/api/items?q=${encodeURIComponent(q)}&order=${order}`).then(r=>r.json()),
      fetch('/api/tags').then(r=>r.json()),
      fetch('/api/tags/trending').then(r=>r.json()),
    ]);
    setItems(itemsRes);
    setAllTags(tagsRes);
    setTrending(trendRes);
    setLoading(false);
  }
  useEffect(()=>{ load(); }, []);
  useEffect(()=>{
    const t = setTimeout(load, 250);
    return ()=>clearTimeout(t);
  }, [q, order]);

  const activeTag = useMemo(()=>{
    const single = q.trim();
    if (single && !single.includes(' ') && allTags.includes(single)) return single;
    return undefined;
  }, [q, allTags]);

  async function addItem(form: FormData) {
    setAdding(true);
    try {
      const payload = {
        name: String(form.get('name')||''),
        description: String(form.get('desc')||''),
        tagsCsv: String(form.get('tags')||''),
        rating: Number(form.get('rating')||'5'),
        comment: String(form.get('comment')||''),
        imageUrl: String(form.get('imageUrl')||'') || null,
      };
      const r = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload)});
      const j = await r.json();
      if (j.ok) { setQ(''); await load(); alert('Eklendi'); }
      else alert('Hata: ' + j.error);
    } finally {
      setAdding(false);
    }
  }

  async function report(id: string) {
    const r = await fetch(`/api/items/${id}/report`, { method: 'POST' });
    const j = await r.json();
    if (j.ok) alert(`Report alındı (${j.count})`);
    else alert('Hata: ' + j.error);
  }

  async function rate(id: string, value: number) {
    const r = await fetch(`/api/items/${id}/rate`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ value })});
    const j = await r.json();
    if (j.ok) { await load(); } else alert('Hata: ' + j.error);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80 dark:bg-gray-900/70 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button className="text-xl font-bold" onClick={()=>{ setQ(''); setOrder('new'); }}>RateStuff</button>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <input ref={searchRef} className="border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400 w-56 pr-7" placeholder="ara ( / )" value={q} onChange={(e)=>setQ(e.target.value)} />
              {q && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm" onClick={()=>setQ('')}>×</button>}
            </div>
            <select className="border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" value={order} onChange={(e)=>setOrder(e.target.value as any)}>
              <option value="new">En yeni</option>
              <option value="top">En çok oy</option>
            </select>
            <Link className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700" href="/items/new">Yeni Item</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <aside>
          <section className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
            <h3 className="text-lg mb-2">Trend Etiketler</h3>
            <div className="flex flex-wrap gap-2">{trending.map(t=>(<Tag key={t} label={t} onClick={(x)=>setQ(x)} active={activeTag===t} />))}</div>
          </section>
          <section className="rounded-2xl border p-4 shadow-sm mt-4 bg-white dark:bg-gray-900 dark:border-gray-800">
            <h3 className="text-lg mb-2">Tüm Etiketler</h3>
            <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-auto pr-1">{allTags.map(t=>(<Tag key={t} label={t} onClick={(x)=>setQ(x)} active={activeTag===t} />))}</div>
          </section>
        </aside>

        <section className="space-y-4">
          <form
            className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-wrap items-center gap-2"
            onSubmit={(e)=>{ e.preventDefault(); addItem(new FormData(e.currentTarget)); }}
          >
            <input name="name" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="adı" required />
            <input name="desc" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="kısa açıklama" required />
            <input name="tags" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="etiketler (virgülle)" required />
            <select name="rating" defaultValue="5" className="border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              {[1,2,3,4,5].map(n=>(<option key={n} value={n}>{n} yıldız</option>))}
            </select>
            <input name="comment" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="yorum" required />
            <input name="imageUrl" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="resim URL'si (opsiyonel)" />
            <button disabled={adding} className="px-3 py-2 rounded-xl text-sm bg-black text-white">{adding ? 'Ekleniyor…' : 'Ekle'}</button>
          </form>

          {loading && <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">Yükleniyor…</div>}

          {!loading && items.length === 0 && (
            <div className="rounded-2xl border p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
              Hiç sonuç yok. İlk itemi sen ekle → <Link className="underline" href="/items/new">Yeni Item</Link>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {items.map(i => (
              <div key={i.id} className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
                <div className="flex items-start gap-3">
                  {i.imageUrl ? (
                    <img src={i.imageUrl} alt={i.name} className="w-24 h-24 object-cover rounded-lg" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-white/5 grid place-items-center text-xs opacity-60 dark:bg-gray-800">no img</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-lg font-medium truncate">{i.name}</h3>
                        {i.edited && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">düzenlendi</span>
                        )}
                      </div>
                      <Stars value={i.avg ?? 0} onRate={(n)=>rate(i.id, n)} />
                    </div>

                    {/* EKLEYEN kişi (masked + avatar) */}
                    {i.createdBy && (
                      <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
                        {i.createdBy.avatarUrl ? (
                          <img src={i.createdBy.avatarUrl} alt={i.createdBy.name || 'u'} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px]">
                            {(i.createdBy.name || 'U')[0]?.toUpperCase()}
                          </div>
                        )}
                        <span>{i.createdBy.name}</span>
                      </div>
                    )}

                    <p className="text-sm opacity-80 line-clamp-2 mt-1">{i.description}</p>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {i.tags.map(t => (
                        <button key={t} className="px-2 py-1 rounded-full text-sm border bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700" onClick={()=>setQ(t)}>#{t}</button>
                      ))}
                    </div>

                    <div className="mt-2 text-xs opacity-70">{i.count} oy</div>
                    <div className="mt-2">
                      <button className="px-3 py-1 rounded-xl border text-sm dark:border-gray-700" onClick={()=>report(i.id)}>Report</button>
                    </div>

                    {/* YORUMLAR (avatar + masked + edited) */}
                    {i.comments?.length > 0 && (
                      <div className="mt-3 space-y-2 text-sm">
                        {i.comments.map((c) => (
                          <div key={c.id} className="flex items-center gap-2">
                            {c.user?.avatarUrl ? (
                              <img src={c.user.avatarUrl} alt={c.user?.name || 'user'} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px]">
                                {(c.user?.name || 'U')[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs opacity-70">{c.user?.name || 'anon'}</span>
                            <span>“{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
