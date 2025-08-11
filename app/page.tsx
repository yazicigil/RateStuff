'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Tag from '@/components/Tag';
import Stars from '@/components/Stars';
import Header from '@/components/Header';
import CollapsibleSection from '@/components/CollapsibleSection';
import ImageUploader from '@/components/ImageUploader';

// --- 401'de otomatik signin'e yönlendiren fetch ---
async function fetchOrSignin(url: string, init?: RequestInit) {
  const res = await fetch(url, init);

  if (res.redirected) { window.location.href = res.url; return null; }
  if (res.status === 401) {
    const back = encodeURIComponent(window.location.href);
    window.location.href = `/api/auth/signin?callbackUrl=${back}`;
    return null;
  }
  return res;
}

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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [quickRating, setQuickRating] = useState(5);
  const [justAdded, setJustAdded] = useState(false);
  const [pulseQuick, setPulseQuick] = useState(false);
  const quickSectionRef = useRef<HTMLDivElement>(null);
  const quickNameRef = useRef<HTMLInputElement>(null);
  const [quickName, setQuickName] = useState('');
  // Kaydedilmiş item ID’leri
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newRating, setNewRating] = useState<number>(5);
  const [starBucket, setStarBucket] = useState<number | null>(null);
  // Çoklu etiket seçimi için state
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  async function loadSavedIds() {
    try {
      const r = await fetch('/api/items/saved-ids', { cache: 'no-store' });
      if (!r.ok) { setSavedIds(new Set()); return; }
      const j = await r.json().catch(() => null);
      const ids: string[] = Array.isArray(j?.ids) ? j.ids : [];
      setSavedIds(new Set(ids));
    } catch {
      setSavedIds(new Set());
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [itemsRes, tagsRes, trendRes] = await Promise.all([
        fetch(`/api/items?q=${encodeURIComponent(q)}&order=${order}`).then(r => r.json()).catch(() => []),
        fetch('/api/tags').then(r => r.json()).catch(() => []),
        fetch('/api/tags/trending').then(r => r.json()).catch(() => []),
      ]);
      setItems(Array.isArray(itemsRes) ? itemsRes : []);
      setAllTags(Array.isArray(tagsRes) ? tagsRes : []);
      setTrending(Array.isArray(trendRes) ? trendRes : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); loadSavedIds(); }, []);
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 250);
    return () => clearTimeout(t);
  }, [q, order]);

  // Kaldırıldı: activeTag ve single-tag selection, çoklu seçim state'e taşındı

  // Yıldız filtresi: ortalama 3.67 → 4 yıldız kovasına girer
  function bucketOf(avg: number | null): number | null {
    if (!avg || avg <= 0) return null;
    return Math.ceil(avg);
  }

  // Filtreleme: yıldız ve çoklu etiket seçimi
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (starBucket) {
      filtered = filtered.filter(i => bucketOf(i.avg) === starBucket);
    }
    if (selectedTags.size > 0) {
      filtered = filtered.filter(i =>
        Array.from(selectedTags).every(tag => i.tags.includes(tag))
      );
    }
    return filtered;
  }, [items, starBucket, selectedTags]);

  async function addItem(form: FormData) {
    setAdding(true);
    try {
      const payload = {
        name: String(form.get('name') || ''),
        description: String(form.get('desc') || ''),
        tagsCsv: String(form.get('tags') || ''),
        rating: Number(form.get('rating') || '5'),
        comment: String(form.get('comment') || ''),
        imageUrl: String(form.get('imageUrl') || '') || null, // ImageUploader, hidden input ile bunu dolduruyor
      };
      const res = await fetchOrSignin('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res) return;
      const j = await res.json().catch(()=>null);
      if (j?.ok) {
        setQ('');
        await load();
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      }
      else alert('Hata: ' + (j?.error || res.status));
    } finally { setAdding(false); }
  }

  async function toggleSave(id: string) {
    const wasSaved = savedIds.has(id);
    // optimistic
    setSavedIds(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(id); else next.add(id);
      return next;
    });

    const method = wasSaved ? 'DELETE' : 'POST';
    const res = await fetchOrSignin(`/api/items/${id}/save`, { method });
    if (!res) { // signin'e yönlendirildiyse geri al
      setSavedIds(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(id); else next.delete(id);
        return next;
      });
      return;
    }
    const j = await res.json().catch(() => null);
    if (!j?.ok) {
      setSavedIds(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(id); else next.delete(id);
        return next;
      });
      alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
      return;
    }
    setOpenMenu(null);
    await loadSavedIds();
  }

  async function rate(id: string, value: number) {
    const res = await fetchOrSignin(`/api/items/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
    if (!res) return;
    const j = await res.json().catch(() => null);
    if (j?.ok) await load(); else alert('Hata: ' + (j?.error || res.status));
  }

  async function sendComment(itemId: string) {
    const text = (drafts[itemId] || '').trim();
    if (!text) return;

    const res = await fetchOrSignin(`/api/items/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res) return;
    const j = await res.json().catch(() => null);
    if (j?.ok) { setDrafts(d => ({ ...d, [itemId]: '' })); await load(); }
    else alert('Hata: ' + (j?.error || res.status));
  }

  function jumpToQuickAdd() {
    const name = q.trim();
    if (name) setQuickName(name);
    // scroll & focus
    quickSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      quickNameRef.current?.focus();
      quickNameRef.current?.select();
    }, 250);
    // visual cue
    setPulseQuick(true);
    setTimeout(() => setPulseQuick(false), 900);
  }

  async function report(id: string) {
    const res = await fetchOrSignin(`/api/items/${id}/report`, { method: 'POST' });
    if (!res) return;
    const j = await res.json().catch(() => null);
    if (j?.ok) alert(`Report alındı (${j.count})`);
    else alert('Hata: ' + (j?.error || res.status));
  }

  const clamp2: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Header controls={{ q, onQ: setQ, order, onOrder: setOrder, starBucket, onStarBucket: setStarBucket }} />

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Sol: etiketler */}
        <aside>
          <CollapsibleSection
            title="Trend Etiketler"
            defaultOpen={true}
            className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
            summaryClassName="text-amber-900 dark:text-amber-200"
          >
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <Tag
                  key={t}
                  label={t}
                  active={selectedTags.has(t)}
                  onClick={() => {
                    setSelectedTags(prev => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t); else next.add(t);
                      return next;
                    });
                  }}
                  onDoubleClick={() => setSelectedTags(new Set())}
                />
              ))}
            </div>
          </CollapsibleSection>

          <div className="h-4" />

          <CollapsibleSection title="Tüm Etiketler" defaultOpen={false}>
            <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-auto pr-1">
              {allTags.map((t) => (
                <Tag
                  key={t}
                  label={t}
                  active={selectedTags.has(t)}
                  onClick={() => {
                    setSelectedTags(prev => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t); else next.add(t);
                      return next;
                    });
                  }}
                  onDoubleClick={() => setSelectedTags(new Set())}
                />
              ))}
            </div>
          </CollapsibleSection>
        </aside>

        {/* Sağ: listeler */}
        <section className="space-y-4">
          
          {/* Hızlı ekleme */}
          <div ref={quickSectionRef} className={pulseQuick ? 'ring-2 ring-emerald-400 rounded-2xl transition' : ''}>
            <CollapsibleSection
              title={
                <span className="flex items-center gap-2">
                  Eklemek istediğin bir şey mi var?
                  {justAdded && (
                    <span className="ml-1 inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] px-2 py-0.5 rounded-full">
                      ✓ Eklendi
                    </span>
                  )}
                </span>
              }
              defaultOpen={true}
            >
              <form
                className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  // mevcut addItem fonksiyonunu çağırıyoruz:
                  const fd = new FormData(e.currentTarget);
                  // Stars ve ImageUploader controlled olduğu için hidden input’lardan geliyor
                  addItem(fd);
                  // adı sıfırla (isteğe bağlı)
                  // setQuickName('');
                }}
              >
                {/* 1. satır: Ad + Kısa açıklama */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={quickNameRef}
                    name="name"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="adı"
                    required
                  />
                  <input
                    name="desc"
                    className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[200px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="kısa açıklama"
                    required
                  />
                  <input
                    name="tags"
                    className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[200px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="etiketler (virgülle)"
                    required
                  />
                </div>

                {/* 2. satır: Yıldız seçimi + Yorum */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70">Puanın:</span>
                    <Stars value={newRating} onRate={(n) => setNewRating(n)} />
                  </div>
                  {/* hidden: addItem tarafına rating’i geçelim */}
                  <input type="hidden" name="rating" value={newRating} />
                  <input
                    name="comment"
                    className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[220px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="yorum"
                    required
                  />
                </div>

                {/* 3. satır: Resim ekle (başlığın altında derli toplu) */}
                <div>
                  <div className="text-sm font-medium mb-2">Resim ekle</div>
                  <ImageUploader value={newImage} onChange={setNewImage} />
                  {/* hidden: addItem tarafına url’i geçelim */}
                  <input type="hidden" name="imageUrl" value={newImage ?? ''} />
                </div>

                {/* 4. satır: Buton sağda ve biraz büyük */}
                <div className="flex justify-end pt-1">
                  <button
                    disabled={adding}
                    className="px-4 py-2.5 rounded-xl text-sm md:text-base bg-black text-white disabled:opacity-60"
                  >
                    {adding ? 'Ekleniyor…' : 'Ekle'}
                  </button>
                </div>
              </form>
            </CollapsibleSection></div>

          {loading && <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">Yükleniyor…</div>}

          {!loading && filteredItems.length === 0 && (
            <div className="rounded-2xl border p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">Hiç sonuç yok.</div>
                <div className="text-sm opacity-80">Eklemek ister misin?</div>
              </div>
              <button
                onClick={jumpToQuickAdd}
                className="px-3 py-2 rounded-xl text-sm bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                Hızlı Ekle
              </button>
            </div>
          )}

          {/* KART IZGARASI */}
          <div className="grid md:grid-cols-2 gap-4">
            {filteredItems.map((i) => {
              const isSaved = savedIds.has(i.id);
              return (
                <div
                  key={i.id}
                  className="relative rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-col"
                >
                  {/* OPTIONS (⋯) – SAĞ ÜST */}
                  <div className="absolute top-3 right-3">
                    <div className="relative">
                      <button
                        className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
                        onClick={() => setOpenMenu(openMenu === i.id ? null : i.id)}
                        aria-label="options"
                      >
                        ⋯
                      </button>

                      {openMenu === i.id && (
                        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1">
                          {/* Kaydet / Kaydedilenlerden Kaldır */}
                          <button
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                              isSaved
                                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                            onClick={() => toggleSave(i.id)}
                          >
                            {isSaved ? 'Kaydedilenlerden Kaldır' : 'Kaydet'}
                          </button>

                          {/* Report */}
                          <button
                            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => { setOpenMenu(null); report(i.id); }}
                          >
                            Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* İÇERİK */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
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

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-semibold leading-snug" style={clamp2} title={i.name}>
                          {i.name}
                        </h3>
                        <p className="text-sm opacity-80 mt-1 break-words">{i.description}</p>

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

                        <div className="mt-2 flex items-center gap-3">
                          <Stars value={i.avg ?? 0} onRate={(n) => rate(i.id, n)} />
                          <span className="text-sm font-medium tabular-nums">{i.avg ? i.avg.toFixed(2) : '—'}</span>
                          <span className="text-xs opacity-60">({i.count})</span>
                        </div>

                        {i.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {i.tags.slice(0, 10).map((t) => (
                              <Tag
                                key={t}
                                label={t}
                                active={selectedTags.has(t)}
                                onClick={() => {
                                  setSelectedTags(prev => {
                                    const next = new Set(prev);
                                    if (next.has(t)) next.delete(t); else next.add(t);
                                    return next;
                                  });
                                }}
                                onDoubleClick={() => setSelectedTags(new Set())}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

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
                  </div>

                  {/* Yorum yaz */}
                  <div className="mt-3 pt-3 border-t dark:border-gray-800 flex items-center gap-2">
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
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
