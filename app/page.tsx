'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Tag from '@/components/Tag';
import Stars from '@/components/Stars';
import Header from '@/components/Header';
import CollapsibleSection from '@/components/CollapsibleSection';

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
  const [q, setQ] = useState('');
  const [order, setOrder] = useState<'new' | 'top'>('new');
  const [items, setItems] = useState<ItemVM[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null); // options menüsü

  async function load() {
    setLoading(true);
    const [itemsRes, tagsRes, trendRes] = await Promise.all([
      fetch(`/api/items?q=${encodeURIComponent(q)}&order=${order}`).then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
      fetch('/api/tags/trending').then((r) => r.json()),
    ]);
    setItems(itemsRes);
    setAllTags(tagsRes);
    setTrending(trendRes);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, order]);

  const activeTag = useMemo(() => {
    const single = q.trim();
    if (single && !single.includes(' ') && allTags.includes(single)) return single;
    return undefined;
  }, [q, allTags]);

  async function addItem(form: FormData) {
    setAdding(true);
    try {
      const payload = {
        name: String(form.get('name') || ''),
        description: String(form.get('desc') || ''),
        tagsCsv: String(form.get('tags') || ''),
        rating: Number(form.get('rating') || '5'),
        comment: String(form.get('comment') || ''),
        imageUrl: String(form.get('imageUrl') || '') || null,
      };
      const r = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.ok) { setQ(''); await load(); alert('Eklendi'); }
      else alert('Hata: ' + j.error);
    } finally { setAdding(false); }
  }

  async function report(id: string) {
    const r = await fetch(`/api/items/${id}/report`, { method: 'POST' });
    const j = await r.json();
    if (j.ok) alert(`Report alındı (${j.count})`);
    else alert('Hata: ' + j.error);
  }

  async function toggleSave(id: string) {
    const r = await fetch(`/api/items/${id}/save`, { method: 'POST' });
    const j = await r.json();
    if (!j.ok) { alert('Hata: ' + (j.error || 'kaydetme hatası')); return; }
    setOpenMenu(null);
    await load();
  }

  async function rate(id: string, value: number) {
    const r = await fetch(`/api/items/${id}/rate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value })
    });
    const j = await r.json();
    if (j.ok) await load(); else alert('Hata: ' + j.error);
  }

  async function sendComment(itemId: string) {
    const text = (drafts[itemId] || '').trim();
    if (!text) return;
    const r = await fetch(`/api/items/${itemId}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
    });
    const j = await r.json();
    if (j.ok) { setDrafts((d) => ({ ...d, [itemId]: '' })); await load(); }
    else alert('Hata: ' + j.error);
  }

  // Başlık 2 satır, kelime ortasından bölme yok
  const clamp2: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Üst bar: arama + sıralama */}
      <Header controls={{ q, onQ: setQ, order, onOrder: setOrder }} />

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Sol: etiketler */}
        <aside>
          <CollapsibleSection title="Trend Etiketler" defaultOpen={true}>
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <Tag key={t} label={t} onClick={(x) => setQ(x)} active={activeTag === t} />
              ))}
            </div>
          </CollapsibleSection>

          <div className="h-4" />

          <CollapsibleSection title="Tüm Etiketler" defaultOpen={false}>
            <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-auto pr-1">
              {allTags.map((t) => (
                <Tag key={t} label={t} onClick={(x) => setQ(x)} active={activeTag === t} />
              ))}
            </div>
          </CollapsibleSection>
        </aside>

        {/* Sağ: listeler */}
        <section className="space-y-4">
          {/* Hızlı ekleme */}
          <form
            className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-wrap items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); addItem(new FormData(e.currentTarget)); }}
          >
            <input name="name" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="adı" required />
            <input name="desc" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="kısa açıklama" required />
            <input name="tags" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="etiketler (virgülle)" required />
            <select name="rating" defaultValue="5" className="border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} yıldız</option>)}
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

          {/* KART IZGARASI */}
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((i) => (
              <div key={i.id} className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 relative">
                {/* OPTIONS (⋯) – sol üst */}
                <div className="absolute top-3 left-3">
                  <div className="relative">
                    <button
                      className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
                      onClick={() => setOpenMenu(openMenu === i.id ? null : i.id)}
                      aria-label="options"
                    >
                      ⋯
                    </button>
                    {openMenu === i.id && (
                      <div className="absolute z-20 mt-2 w-40 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1">
                        <button
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                          onClick={() => toggleSave(i.id)}
                        >
                          Kaydet / Kaldır
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                          onClick={() => { setOpenMenu(null); report(i.id); }}
                        >
                          Report
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ÜST: sol görsel + rozet, sağ bilgiler */}
                <div className="flex items-start gap-3">
                  {/* SOL BLOK */}
                  <div className="flex flex-col items-center shrink-0 w-28">
                    {i.imageUrl ? (
                      <img src={i.imageUrl} alt={i.name} className="w-28 h-28 object-cover rounded-lg" />
                    ) : (
                      <div className="w-28 h-28 rounded-lg bg-white/5 grid place-items-center text-xs opacity-60 dark:bg-gray-800">no img</div>
                    )}
                    {i.edited && (
                      <span className="text-[11px] px-2 py-0.5 mt-1 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">
                        düzenlendi
                      </span>
                    )}
                  </div>

                  {/* SAĞ BLOK */}
                  <div className="flex-1 min-w-0">
                    {/* Başlık */}
                    <h3 className="text-base md:text-lg font-semibold leading-snug" style={clamp2} title={i.name}>
                      {i.name}
                    </h3>

                    {/* Küçük açıklama */}
                    <p className="text-sm opacity-80 mt-1 break-words">{i.description}</p>

                    {/* Ekleyen kişi */}
                    {i.createdBy && (
                      <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
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

                    {/* Yıldız + skor */}
                    <div className="mt-2 flex items-center gap-3">
                      <Stars value={i.avg ?? 0} onRate={(n) => rate(i.id, n)} />
                      <span className="text-sm font-medium tabular-nums">{i.avg ? i.avg.toFixed(2) : '—'}</span>
                      <span className="text-xs opacity-60">({i.count})</span>
                    </div>

                    {/* ETİKETLER */}
                    {i.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {i.tags.slice(0, 10).map((t) => (
                          <button
                            key={t}
                            className="px-2 py-0.5 rounded-full text-xs border bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
                            onClick={() => setQ(t)}
                            title={`#${t}`}
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ALT: yorumlar + yorum yaz — tam genişlik */}
                {(i.comments?.length ?? 0) > 0 && <div className="mt-3 border-t dark:border-gray-800" />}

                {i.comments?.length > 0 && (
                  <div className="pt-3 space-y-2 text-sm">
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

                {/* Yorum yaz – her zaman KARTIN EN ALTINDA */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={drafts[i.id] || ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [i.id]: e.target.value }))}
                    placeholder="yorum yaz…"
                    className="flex-1 min-w-0 border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                  <button
                    onClick={() => sendComment(i.id)}
                    className="px-3 py-2 rounded-xl text-sm bg-black text-white shrink-0"
                  >
                    Gönder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
