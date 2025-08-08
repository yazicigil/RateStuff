'use client';
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StarRating from "@/components/StarRating";

type Item = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  avg: number | null;
  count: number;
  comments: { id: string; text: string }[];
  tags: string[];
};

export default function HomePage() {
  const [q, setQ] = useState('');
  const [order, setOrder] = useState<'new'|'top'>('new');
  const [items, setItems] = useState<Item[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [itemsRes, trendRes, tagsRes] = await Promise.all([
      fetch(`/api/items?q=${encodeURIComponent(q)}&order=${order}`).then(r => r.json()),
      fetch('/api/tags/trending').then(r => r.json()),
      fetch('/api/tags').then(r => r.json())
    ]);
    setItems(itemsRes);
    setTrending(trendRes);
    setAllTags(tagsRes);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // update on q/order
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q, order]);

  return (
    <div className="grid">
      <aside className="sidebar">
        <div className="section">
          <h3 className="text-lg mb-2">Trend Etiketler</h3>
          <div className="flex flex-wrap gap-2">
            {trending.map(t => (
              <button key={t} onClick={()=>setQ(t)} className="badge">{t}</button>
            ))}
          </div>
        </div>
        <div className="section">
          <h3 className="text-lg mb-2">Tüm Etiketler</h3>
          <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-auto pr-1">
            {allTags.map(t => (
              <button key={t} onClick={()=>setQ(t)} className="badge">{t}</button>
            ))}
          </div>
        </div>
      </aside>

      <section className="space-y-4">
        <div className="card flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder="Ara veya etikete tıkla…"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
          <select className="input" value={order} onChange={e=>setOrder(e.target.value as any)}>
            <option value="new">En yeni</option>
            <option value="top">En iyi</option>
          </select>
          <Link className="btn" href="/items/new">Yeni Item</Link>
        </div>

        {loading && <div className="card">Yükleniyor…</div>}

        {!loading && items.length === 0 && (
          <div className="card">
            Hiç sonuç yok. İlk itemi sen ekle → <Link className="link" href="/items/new">Yeni Item</Link>
          </div>
        )}

        <div className="grid" style={{gridTemplateColumns: "1fr 1fr"}}>
          {items.map(item => (
            <div key={item.id} className="card">
              <div className="flex items-start gap-3">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-lg" /> : <div className="w-20 h-20 rounded-lg bg-white/5 grid place-items-center">no img</div>}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{item.name}</h3>
                    <StarRating value={item.avg ?? 0} />
                  </div>
                  <p className="text-sm opacity-80 line-clamp-2">{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.tags.map(t => (
                      <button key={t} onClick={()=>setQ(t)} className="badge">{t}</button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs opacity-70">{item.count} oy</div>
                  <div className="mt-2 flex gap-2">
                    <button className="btn" onClick={async()=>{
                      const r = await fetch(`/api/items/${item.id}/report`, { method: 'POST' });
                      const j = await r.json();
                      alert(j.ok ? `Report alındı (${j.count})` : 'Hata: ' + j.error);
                    }}>Report</button>
                  </div>
                </div>
              </div>
              {item.comments?.[0] && <div className="mt-2 text-sm opacity-80">“{item.comments[0].text}”</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
