'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Tag from "@/components/Tag";
import Stars from "@/components/Stars";
import Header from "@/components/Header";

type ItemVM = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  avg: number | null;
  count: number;
  edited?: boolean;
  createdBy?: { id: string; name: string; avatarUrl?: string | null } | null;
  comments: {
    id: string;
    text: string;
    edited?: boolean;
    user?: { name?: string | null; avatarUrl?: string | null };
  }[];
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
  const [me, setMe] = useState<{ id: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [itemsRes, tagsRes, trendRes] = await Promise.all([
        fetch(`/api/items?q=${encodeURIComponent(q)}&order=${order}`).then(r=>r.json()),
        fetch('/api/tags').then(r=>r.json()),
        fetch('/api/tags/trending').then(r=>r.json()),
      ]);
      setItems(itemsRes);
      setAllTags(tagsRes);
      setTrending(trendRes);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, []);
  useEffect(()=>{
    const t = setTimeout(load, 250);
    return ()=>clearTimeout(t);
  }, [q, order]);

  // me bilgisi (yorum kutusunu göstermek için)
  useEffect(() => {
    let ok = true;
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (ok) setMe(j?.me ? { id: j.me.id } : null); })
      .catch(()=>{})
    return () => { ok = false; };
  }, []);

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
        imageUrl: (String(form.get('imageUrl')||'') || null),
      };
      const r = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
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
    const r = await fetch(`/api/items/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ value })
    });
    const j = await r.json();
    if (j.ok) { await load(); } else alert('Hata: ' + j.error);
  }

  async function addComment(itemId: string, text: string) {
    const r = await fetch(`/api/items/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ text }),
    });
    const j = await r.json();
    if (j.ok) await load();
    else alert('Hata: ' + j.error);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Yeni header: arama + sıralama burada */}
      <Header controls={{ q, onQ: setQ, order, onOrder: setOrder }} />

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <aside>
          <section className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
            <h3 className="text-lg mb-2">Trend Etiketler</h3>
            <div className="flex flex-wrap gap-2">
              {trending.map(t=>(
                <Tag key={t} label={t} onClick={(x)=>setQ(x)} active={activeTag===t} />
              ))}
            </div>
          </section>
          <section className="rounded-2xl border p-4 shadow-sm mt-4 bg-white dark:bg-gray-900 dark:border-gray-800">
            <h3 className="text-lg mb-2">Tüm Etiketler</h3>
            <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-auto pr-1">
              {allTags.map(t=>(
                <Tag key={t} label={t} onClick={(x)=>setQ(x)} active={activeTag===t} />
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          {/* (İstersen) hızlı ekleme formu */}
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

          {loading && (
            <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
              Yükleniyor…
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="rounded-2xl border p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
              Hiç sonuç yok. İlk itemi sen ekle → <Link className="underline" href="/items/new">Yeni Item</Link>
            </div>
          )}

          {/* KARTLAR */}
          <div className="grid md:grid-cols-2 gap-5">
            {items.map(i => (
              <div
                key={i.id}
                className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-col"
              >
                <div className="flex gap-3">
                  {/* Görsel + düzenlendi rozeti (altta) */}
                  <div className="relative flex flex-col items-center">
                    {i.imageUrl ? (
                      <img
                        src={i.imageUrl}
                        alt={i.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-white/5 grid place-items-center text-xs opacity-60 dark:bg-gray-800">
                        no img
                      </div>
                    )}
                    {i.edited && (
                      <span className="text-[11px] px-2 py-0.5 mt-1 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">
                        düzenlendi
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Başlık + yıldız */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-semibold leading-snug line-clamp-2">
                          {i.name}
                        </h3>

                        {/* Ekleyen (masked + avatar) */}
                        {i.createdBy && (
                          <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
                            {i.createdBy.avatarUrl ? (
                              <img
                                src={i.createdBy.avatarUrl}
                                alt={i.createdBy.name || "u"}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px]">
                                {(i.createdBy.name || "U")[0]?.toUpperCase()}
                              </div>
                            )}
                            <span>{i.createdBy.name}</span>
                          </div>
                        )}
                      </div>

                      <Stars value={i.avg ?? 0} onRate={(n) => rate(i.id, n)} />
                    </div>

                    {/* Açıklama */}
                    <p className="text-sm opacity-80 mt-2 line-clamp-2">
                      {i.description}
                    </p>

                    {/* Etiketler */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {i.tags.map((t) => (
                        <button
                          key={t}
                          className="px-2 py-1 rounded-full text-sm border bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
                          onClick={() => setQ(t)}
                        >
                          #{t}
                        </button>
                      ))}
                    </div>

                    {/* Oy sayısı + Report */}
                    <div className="mt-2 text-xs opacity-70">{i.count} oy</div>
                    <div className="mt-2">
                      <button
                        className="px-3 py-1 rounded-xl border text-sm dark:border-gray-700"
                        onClick={() => report(i.id)}
                      >
                        Report
                      </button>
                    </div>

                    {/* Yorumlar */}
                    {i.comments?.length > 0 && (
                      <div className="mt-3 space-y-2 text-sm border-t pt-2">
                        {i.comments.map((c) => (
                          <div key={c.id} className="flex items-start gap-2">
                            {c.user?.avatarUrl ? (
                              <img
                                src={c.user.avatarUrl}
                                alt={c.user?.name || "user"}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px]">
                                {(c.user?.name || "U")[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-[11px] opacity-70">
                                {c.user?.name || "anon"} {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                              </div>
                              <div>“{c.text}”</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Yorum ekle */}
                    <div className="mt-2">
                      {me ? (
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const text = String(fd.get('comment') || '').trim();
                            if (text) addComment(i.id, text);
                            (e.currentTarget.elements.namedItem('comment') as HTMLInputElement).value = '';
                          }}
                        >
                          <input
                            name="comment"
                            placeholder="yorum yaz…"
                            className="flex-1 border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                          />
                          <button className="px-3 py-2 rounded-xl text-sm bg-black text-white">
                            Gönder
                          </button>
                        </form>
                      ) : (
                        <Link
                          href="/api/auth/signin/google?callbackUrl=/"
                          className="px-2 py-1 rounded-xl border text-sm dark:border-gray-700 inline-block"
                        >
                          Yorum için giriş yap
                        </Link>
                      )}
                    </div>
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
