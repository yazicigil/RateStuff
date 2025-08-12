
'use client';
import React from "react";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCallback, useRef } from "react";
import Stars from "@/components/Stars";
import { signOut } from "next-auth/react";
import ImageUploader from "@/components/ImageUploader";
import { useSession } from "next-auth/react";

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 3.75A2.25 2.25 0 0 1 11.25 1.5h1.5A2.25 2.25 0 0 1 15 3.75V4.5h3.75a.75.75 0 0 1 0 1.5h-.32l-1.07 13.393A3.75 3.75 0 0 1 13.62 23.25H10.38a3.75 3.75 0 0 1-3.74-3.857L5.57 6H5.25a.75.75 0 0 1 0-1.5H9V3.75Zm1.5.75h3V3.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V4.5Z"/>
      <path d="M8.069 6l1.06 13.268a2.25 2.25 0 0 0 2.25 2.082h1.242a2.25 2.25 0 0 0 2.25-2.082L15.931 6H8.069Z"/>
    </svg>
  );
}
function IconPencil({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.862 3.487a1.875 1.875 0 0 1 2.651 2.651L8.9 16.75a4.5 4.5 0 0 1-1.897 1.128l-2.935.881a.75.75 0 0 1-.93-.93l.881-2.935A4.5 4.5 0 0 1 5.25 13.1L16.862 3.487Z"/>
      <path d="M18.225 8.401l-2.626-2.626 1.06-1.06a.375.375 0 0 1 .53 0l2.096 2.096a.375.375 0 0 1 0 .53l-1.06 1.06Z"/>
    </svg>
  );
}

type MyItem = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  avg: number | null;
  edited?: boolean;
  tags?: string[]; // saved filtre + kartlarda gösterim
};
type MyRating  = { id: string; itemId: string; itemName: string; value: number };
type MyComment = {
  id: string;
  itemId: string;
  itemName: string;
  itemImageUrl?: string | null;
  text: string;
  edited?: boolean;
};

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [me, setMe]           = useState<{ id:string; name?:string|null; avatarUrl?:string|null }|null>(null);
  const [items, setItems]     = useState<MyItem[]>([]);
  const [saved, setSaved]     = useState<MyItem[]>([]);
  const [ratings, setRatings] = useState<MyRating[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
  // Trend etiketler
  const [trending, setTrending] = useState<string[]>([]);

  // Eklediklerimi düzenleme
  const [editingItem, setEditingItem] = useState<string|null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editImg,  setEditImg]  = useState<string|null>(null);

  // Kaydedilenler filtre (çoklu tag seçimi)
  const [savedSelected, setSavedSelected] = useState<Set<string>>(new Set());

  // Yorumlar: kaç adet görünüyor
  const [commentsLimit, setCommentsLimit] = useState(5);

  // toast
  const [toast, setToast] = useState<string | null>(null);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout((notify as any)._t);
    (notify as any)._t = window.setTimeout(() => setToast(null), 2200);
  }, []);

  // giriş kontrolü
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/signin";
    }
  }, [status]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (r.status === 401) {
        window.location.href = "/";
        return;
      }
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok || !data?.ok) throw new Error(data?.error || `status ${r.status}`);

      setMe(data.me || null);
      setItems(data.items || []);
      setSaved(data.saved || []);
      setRatings(data.ratings || []);
      setComments(data.comments || []);
      // Trend etiketleri yükle
      try {
        const t = await fetch('/api/tags/trending', { cache: 'no-store' })
          .then(r => r.json())
          .catch(() => []);
        if (Array.isArray(t)) setTrending(t as string[]);
      } catch {}
    } catch (e: any) {
      setError(`Hata: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Kaydedilenler için mevcut tag’lar (sadece saved içinden)
  const savedTags = useMemo(() => {
    const s = new Set<string>();
    for (const it of saved) (it.tags || []).forEach(t => s.add(t));
    return Array.from(s).sort();
  }, [saved]);

  const filteredSaved = useMemo(() => {
    if (savedSelected.size === 0) return saved;
    return saved.filter(it => {
      const tags = new Set(it.tags || []);
      for (const t of savedSelected) if (!tags.has(t)) return false;
      return true;
    });
  }, [saved, savedSelected]);

  async function saveItem(id: string) {
    const body: any = { description: editDesc, imageUrl: editImg ?? null };
    const r = await fetch(`/api/items/${id}/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      setEditingItem(null);
      await load();
      notify('Güncellendi');
    } else alert("Hata: " + (j?.error || r.status));
  }

  async function changeRating(itemId: string, value: number) {
    const r = await fetch(`/api/items/${itemId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const j = await r.json().catch(() => null);
    if (j?.ok) await load();
    else alert("Hata: " + (j?.error || r.status));
  }

  async function saveComment(commentId: string, nextText: string) {
    const r = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: nextText }),
    });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      notify('Yorum güncellendi');
      await load();
    }
    else alert("Hata: " + (j?.error || r.status));
  }

  async function deleteComment(commentId: string) {
    const ok = window.confirm("Yorumu kaldırmak istediğine emin misin?");
    if (!ok) return;
    const r = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      notify('Yorum silindi');
    } else {
      alert("Hata: " + (j?.error || r.status));
    }
  }

  async function removeSaved(itemId: string) {
    const ok = window.confirm("Kaydedilenlerden kaldırmak istediğine emin misin?");
    if (!ok) return;
    const r = await fetch(`/api/items/${itemId}/save`, { method: "DELETE" });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      setSaved(prev => prev.filter(x => x.id !== itemId));
      notify('Kaydedilenden kaldırıldı');
    } else {
      alert("Hata: " + (j?.error || r.status));
    }
  }

  async function deleteItem(itemId: string) {
    const ok = window.confirm("Bu öğeyi silmek istediğine emin misin? Bu işlem geri alınamaz.");
    if (!ok) return;

    // 1) Try native DELETE first
    let r = await fetch(`/api/items/${itemId}`, { method: "DELETE" });

    // 2) If the route doesn't allow DELETE (405) or isn't found (404), try a common fallback POST endpoint
    if (r.status === 405 || r.status === 404) {
      r = await fetch(`/api/items/${itemId}/delete`, { method: "POST" });
    }

    let j: any = null;
    try { j = await r.json(); } catch {}

    if (r.ok && j?.ok !== false) {
      setItems(prev => prev.filter(x => x.id !== itemId));
      notify('Silindi');
    } else {
      alert('Hata: ' + (j?.error || `${r.status} ${r.statusText}`));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80 dark:bg-gray-900/70 dark:border-gray-800">
        <div className="relative max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 rounded-xl border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Anasayfa"
              title="Anasayfa"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M12.78 4.22a.75.75 0 0 1 0 1.06L8.56 9.5l4.22 4.22a.75.75 0 1 1-1.06 1.06l-4.75-4.75a.75.75 0 0 1 0-1.06l4.75-4.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </Link>
            <span className="text-lg font-semibold">Profil</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
          >
            Çıkış
          </button>
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <img src="/logo.svg" alt="RateStuff" loading="lazy" decoding="async" className="h-14 w-auto dark:invert" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Profil kartı */}
        <section className="rounded-2xl border p-5 shadow-sm bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-gray-900 dark:to-gray-900 dark:border-gray-800 flex items-center gap-4">
          <div className="relative">
            {me?.avatarUrl ? (
              <img src={me.avatarUrl} alt="me" loading="lazy" decoding="async" className="w-14 h-14 rounded-full object-cover ring-2 ring-violet-300 dark:ring-violet-700" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-200 ring-2 ring-violet-300 dark:ring-violet-700" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base md:text-lg font-semibold truncate">{me?.name || "Profilim"}</div>
            <div className="text-xs opacity-70">Yalnızca burada gerçek adın gösterilir</div>
          </div>
        </section>

        {/* Quick stats / anchors */}
        <nav className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mt-2">
          {[
            { id: 'saved',    label: 'Kaydedilenler', count: saved.length },
            { id: 'items',    label: 'Eklediklerim',  count: items.length },
            { id: 'ratings',  label: 'Puanlarım',     count: ratings.length },
            { id: 'comments', label: 'Yorumlarım',    count: comments.length },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="group rounded-xl border dark:border-gray-800 bg-white dark:bg-gray-900 py-3 px-4 text-left hover:shadow-md hover:-translate-y-0.5 transition"
            >
              <div className="text-xs opacity-60">{s.label}</div>
              <div className="text-xl font-semibold">{s.count}</div>
            </button>
          ))}
        </nav>

        {/* 1) KAYDEDİLENLER — en üstte, default açık, etiket filtreli */}
        <Section id="saved" title="🔖 Kaydedilenler" defaultOpen>
          {loading ? (
            <Skeleton rows={4} />
          ) : saved.length === 0 ? (
            <Box>Henüz yok.</Box>
          ) : (
            <>
              {/* Etiket filtresi (sadece saved içinde etiket varsa görünür) */}
              {savedTags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    className={`px-2 py-1 rounded-full border text-xs ${
                      savedSelected.size === 0 ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-900 dark:border-gray-800'
                    }`}
                    onClick={() => setSavedSelected(new Set())}
                    onDoubleClick={() => setSavedSelected(new Set())}
                  >
                    Hepsi
                  </button>
                  {savedTags.map(t => {
                    const isSel = savedSelected.has(t);
                    const isTrend = trending.includes(t);
                    const base = 'px-2 py-1 rounded-full border text-xs';
                    const className = isSel
                      ? (isTrend
                          ? `${base} bg-violet-600 text-white border-violet-600 hover:bg-violet-700`
                          : `${base} bg-black text-white border-black`)
                      : (isTrend
                          ? `${base} bg-violet-100 text-violet-900 border-violet-300 hover:bg-violet-200 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-800/60`
                          : `${base} bg-white dark:bg-gray-900 dark:border-gray-800`);
                    return (
                      <button
                        key={t}
                        className={className}
                        onClick={() =>
                          setSavedSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(t)) next.delete(t); else next.add(t);
                            return next;
                          })
                        }
                        onDoubleClick={() => setSavedSelected(new Set())}
                        title={isSel ? 'Filtreden kaldır' : 'Filtreye ekle'}
                      >
                        #{t}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {filteredSaved.map(it => (
                  <div key={it.id} className="rounded-xl border p-4 bg-white dark:bg-gray-900 dark:border-gray-800 transition hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 grid place-items-center">
                        {it.imageUrl ? (
                          <img src={it.imageUrl} alt={it.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs opacity-60">no img</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-base font-medium truncate">{it.name}</div>
                          <button
                            onClick={() => removeSaved(it.id)}
                            className="text-xs px-2 py-1 rounded-lg border hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-1"
                            title="Kaydedilenlerden kaldır"
                            aria-label="Kaydedilenlerden kaldır"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs opacity-70">{it.avg ? `${it.avg.toFixed(2)} ★` : "—"}</div>
                        <p className="text-sm opacity-80 mt-1 line-clamp-3">{it.description}</p>

                        {!!(it.tags && it.tags.length) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {it.tags.slice(0, 10).map(t => {
                              const isTrend = trending.includes(t);
                              return (
                                <span
                                  key={t}
                                  className={
                                    "px-2 py-0.5 rounded-full text-xs border " +
                                    (isTrend
                                      ? "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700"
                                      : "bg-white dark:bg-gray-800 dark:border-gray-700")
                                  }
                                  title={isTrend ? "Trend" : undefined}
                                >
                                  #{t}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {it.edited && (
                          <span className="mt-2 inline-block text-[11px] px-2 py-0.5 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">
                            düzenlendi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* 2) EKLEDİKLERİM — collapsible, içinde ImageUploader ile düzenleme */}
        <Section id="items" title="➕ Eklediklerim">
          {loading ? (
            <Skeleton rows={4} />
          ) : items.length === 0 ? (
            <Box>Henüz yok.</Box>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {items.map(it => (
                <ItemEditor
                  key={it.id}
                  it={it}
                  editingItem={editingItem}
                  setEditingItem={(id) => {
                    setEditingItem(id);
                    if (id === it.id) {
                      setEditDesc(it.description || "");
                      setEditImg(it.imageUrl ?? null);
                    }
                  }}
                  editDesc={editDesc}
                  setEditDesc={setEditDesc}
                  editImg={editImg}
                  setEditImg={setEditImg}
                  onSave={() => saveItem(it.id)}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          )}
        </Section>

        {/* 3) PUANLARIM — collapsible */}
        <Section id="ratings" title="⭐ Puanlarım">
          {loading ? (
            <Skeleton rows={4} />
          ) : ratings.length === 0 ? (
            <Box>Puan vermemişsin.</Box>
          ) : (
            <div className="space-y-2">
              {ratings.map(r => (
                <div key={r.id} className="rounded-xl border p-3 flex items-center justify-between">
                  <div className="truncate">{r.itemName}</div>
                  <Stars value={r.value} onRate={(n) => changeRating(r.itemId, n)} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 4) YORUMLARIM — collapsible, 2 sütun, son 5 + daha fazla */}
        <Section id="comments" title="💬 Yorumlarım">
          {loading ? (
            <Skeleton rows={4} />
          ) : comments.length === 0 ? (
            <Box>Yorumun yok.</Box>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-3 items-stretch">
                {comments.slice(0, commentsLimit).map(c => (
                  <CommentRow
                    key={c.id}
                    c={c}
                    onSave={saveComment}
                    onDelete={deleteComment}
                  />
                ))}
              </div>
              {comments.length > commentsLimit && (
                <div className="pt-2">
                  <button
                    className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
                    onClick={() => setCommentsLimit(l => l + 5)}
                  >
                    Daha fazla göster
                  </button>
                </div>
              )}
            </>
          )}
        </Section>
      </main>
      {toast && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <div className="rounded-xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg px-4 py-2 text-sm">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* — Collapsible Section (+/- ikonlu) — */
function Section({
  id,
  title,
  defaultOpen = false,
  children,
}: { id?: string; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full cursor-pointer select-none px-4 py-3 text-lg font-semibold flex items-center justify-between"
      >
        <span>{title}</span>
        <span className="text-sm opacity-60">{open ? '-' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </section>
  );
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl border dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
      ))}
    </div>
  );
}

function Box({ children }:{children:any}) {
  return <div className="rounded-xl border dark:border-gray-800 p-3 bg-white dark:bg-gray-900 flex items-center gap-2">{children}</div>;
}

/* — Editor kartı (ImageUploader entegre) — */
function ItemEditor(props: {
  it: MyItem;
  editingItem: string|null; setEditingItem: (id:string|null)=>void;
  editDesc: string; setEditDesc: (s:string)=>void;
  editImg: string|null; setEditImg: (s:string|null)=>void;
  onSave: ()=>Promise<void>|void;
  onDelete: (id: string) => Promise<void> | void;  // <-- EKLENDİ
}) {
  const {
    it, editingItem, setEditingItem, editDesc, setEditDesc, editImg, setEditImg, onSave, onDelete // <-- EKLENDİ
  } = props;
  const isEditing = editingItem === it.id;

  return (
    <div className="rounded-xl border p-4 bg-white dark:bg-gray-900 dark:border-gray-800 transition hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        {it.imageUrl ? (
          <img src={it.imageUrl} loading="lazy" decoding="async" className="w-20 h-20 rounded-lg object-cover" alt={it.name} />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-200 grid place-items-center text-xs">no img</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-medium truncate">{it.name}</div>
            {it.edited && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">düzenlendi</span>
            )}
          </div>
          <div className="text-xs opacity-70">{it.avg ? `${it.avg.toFixed(2)} ★` : "—"}</div>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium">Açıklama</label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                rows={3}
                value={editDesc}
                onChange={(e)=>setEditDesc(e.target.value)}
                placeholder="açıklama"
              />

              <div>
                <div className="text-sm font-medium mb-1">Görsel</div>
                <ImageUploader value={editImg ?? null} onChange={setEditImg} />
              </div>

              <div className="flex gap-2">
                <button onClick={()=>onSave()} className="px-3 py-1.5 rounded-lg border text-sm bg-black text-white">Kaydet</button>
                <button onClick={()=>setEditingItem(null)} className="px-3 py-1.5 rounded-lg border text-sm">Vazgeç</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm opacity-80 mt-1">{it.description}</p>
              <div className="mt-2 flex gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2"
                  onClick={()=>{
                    setEditingItem(it.id);
                    setEditDesc(it.description || "");
                    setEditImg(it.imageUrl ?? null);
                  }}
                  title="Düzenle"
                  aria-label="Düzenle"
                >
                  <IconPencil className="w-4 h-4" />
                  <span className="sr-only">Düzenle</span>
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  onClick={() => onDelete(it.id)}  // <-- deleteItem yerine prop
                  title="Sil"
                  aria-label="Sil"
                >
                  <IconTrash className="w-4 h-4" />
                  <span className="sr-only">Sil</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* — Yorum satırı, kaldırma butonlu — */
function CommentRow({
  c,
  onSave,
  onDelete,
}: {
  c: MyComment;
  onSave: (id:string, t:string)=>Promise<void>;
  onDelete: (id:string)=>Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.text);
  return (
    <div className="rounded-xl border dark:border-gray-800 p-3 bg-white dark:bg-gray-900 transition hover:shadow-md hover:-translate-y-0.5 h-full">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 grid place-items-center">
          {c.itemImageUrl ? (
            <img src={c.itemImageUrl} alt={c.itemName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] opacity-60">no img</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm opacity-70 truncate">{c.itemName}</div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={val}
                onChange={(e)=>setVal(e.target.value)}
                rows={3}
                className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg border text-sm bg-black text-white"
                  onClick={()=>onSave(c.id, val).then(()=>setEditing(false))}
                >
                  Kaydet
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg border text-sm"
                  onClick={()=>{ setEditing(false); setVal(c.text); }}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm">
              “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
              <div className="mt-2 flex gap-2">
                <button
                  className="p-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center"
                  onClick={()=>setEditing(true)}
                  title="Düzenle"
                  aria-label="Düzenle"
                >
                  <IconPencil className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded-lg border text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center"
                  onClick={()=>onDelete(c.id)}
                  title="Yorumu kaldır"
                  aria-label="Yorumu kaldır"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}