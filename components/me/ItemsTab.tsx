'use client';
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ImageUploader from '@/components/common/ImageUploader';
import RatingPill from '@/components/common/RatingPill';

/** — Tipler — */
export type MyItem = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  avg: number | null;
  avgRating?: number | null;   // eski/yeni payload uyumu
  count?: number;
  edited?: boolean;
  suspended?: boolean;
  tags?: string[];
};

/** — Yardımcılar — */
const getAvg = (x: { avg?: number | null; avgRating?: number | null } | null | undefined) =>
  (x as any)?.avgRating ?? (x as any)?.avg ?? null;

const spotlightHref = (id: string) => `/?item=${id}`;

// "iki kelime, tek etiket" -> ["iki kelime", "tek etiket"]
function parseTagsInput(input: string): string[] {
  return Array.from(new Set(
    (input || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.replace(/^#\s*/, ''))
      .map(s => s.toLowerCase())
  ));
}

function makeBannedRegex(list?: string[] | null) {
  if (!list || list.length === 0) return null;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = list.filter(Boolean).map(w => esc(w.trim())).filter(Boolean);
  if (!parts.length) return null;
  return new RegExp(`\\b(${parts.join('|')})\\b`, 'iu');
}

/** — Public API — */
export default function ItemsTab({
  items,
  trending,
  loading,
  notify,
  onReload,          // entegrasyonda istersen parent yeniden yüklesin
  bannedWords,       // opsiyonel yasaklı kelime listesi
}: {
  items: MyItem[];
  trending: string[];
  loading: boolean;
  notify: (msg: string) => void;
  onReload?: () => void | Promise<void>;
  bannedWords?: string[];
}) {
  const [itemsSelected, setItemsSelected] = useState<Set<string>>(new Set());

  // Inline edit state (component içinde lokal)
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editImg, setEditImg] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string>('');

  // Banned kelime kontrolü (opsiyonel)
  const BANNED_RE = useMemo(() => makeBannedRegex(bannedWords), [bannedWords]);
  const findBanned = useCallback((text: string | null | undefined): string | null => {
    if (!text || !BANNED_RE) return null;
    const m = text.match(BANNED_RE);
    return m ? m[0] : null;
  }, [BANNED_RE]);
  const violatedItem = findBanned(editDesc);

  // Derive tag list from items
  const itemsTags = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) (it.tags || []).forEach(t => s.add(t));
    return Array.from(s).sort();
  }, [items]);

  // Filtered items by selected tags (AND)
  const filteredItems = useMemo(() => {
    if (itemsSelected.size === 0) return items;
    return items.filter(it => {
      const tags = new Set(it.tags || []);
      for (const t of itemsSelected) if (!tags.has(t)) return false;
      return true;
    });
  }, [items, itemsSelected]);

  /** — API çağrıları (lokal) — */
  async function saveItemLocal(id: string) {
    const body: any = {
      description: editDesc,
      imageUrl: editImg ?? null,
      tags: parseTagsInput(editTags),
    };
    const r = await fetch(`/api/items/${id}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      setEditingItem(null);
      notify('Güncellendi');
      await onReload?.();
    } else {
      alert('Hata: ' + (j?.error || r.status));
    }
  }

  async function deleteItemLocal(itemId: string) {
    let r = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    if (r.status === 405 || r.status === 404) {
      r = await fetch(`/api/items/${itemId}/delete`, { method: 'POST' });
    }
    let j: any = null;
    try { j = await r.json(); } catch {}
    if (r.ok && j?.ok !== false) {
      notify('Silindi');
      await onReload?.();
    } else {
      alert('Hata: ' + (j?.error || `${r.status} ${r.statusText}`));
    }
  }


  return (
    <section className="fade-slide-in rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="px-4 pb-4 pt-3 space-y-3">
        {loading ? (
          <Skeleton rows={4} />
        ) : items.length === 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/#quick-add"
              prefetch={false}
              className="rounded-2xl border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 dark:text-green-300 dark:border-green-600 dark:bg-green-900/10 dark:hover:bg-green-900/20 grid place-items-center h-56 sm:h-64 transition"
              aria-label="Hızlı ekle"
              title="Hızlı ekle"
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-5xl leading-none">+</span>
                <span className="text-base font-medium">Ekle</span>
              </div>
            </Link>
          </div>
        ) : (
          <>
            {/* Tag filter */}
            {itemsTags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  className={`px-2 py-1 rounded-full border text-xs ${
                    itemsSelected.size === 0 ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-900 dark:border-gray-800'
                  }`}
                  onClick={() => setItemsSelected(new Set())}
                  onDoubleClick={() => setItemsSelected(new Set())}
                >
                  Hepsi
                </button>
                {itemsTags.map(t => {
                  const isSel = itemsSelected.has(t);
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
                        setItemsSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(t)) next.delete(t); else next.add(t);
                          return next;
                        })
                      }
                      onDoubleClick={() => setItemsSelected(new Set())}
                      title={isSel ? 'Filtreden kaldır' : 'Filtreye ekle'}
                    >
                      #{t}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {/* Quick Add card */}
              <Link
                href="/#quick-add"
                prefetch={false}
                className="rounded-2xl border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 dark:text-green-300 dark:border-green-600 dark:bg-green-900/10 dark:hover:bg-green-900/20 grid place-items-center h-44 transition"
                aria-label="Hızlı ekle"
                title="Hızlı ekle"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl leading-none">+</span>
                  <span className="text-sm font-medium">Ekle</span>
                </div>
              </Link>

              {filteredItems.map(it => {
                return (
                  <ItemEditor
                    key={it.id}
                    it={it}
                    trending={trending}
                    // edit state
                    editingItem={editingItem}
                    setEditingItem={(id) => {
                      setEditingItem(id);
                      if (id === it.id) {
                        setEditDesc(it.description || '');
                        setEditImg(it.imageUrl ?? null);
                        setEditTags((it.tags || []).join(', '));
                      }
                    }}
                    editDesc={editDesc}
                    setEditDesc={setEditDesc}
                    editImg={editImg}
                    setEditImg={setEditImg}
                    editTags={editTags}
                    setEditTags={setEditTags}
                    // actions
                    onSave={() => { if (violatedItem) return; return saveItemLocal(it.id); }}
                    onDelete={deleteItemLocal}
                    // validation
                    violatedItem={violatedItem}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* — Editor kartı — */
function ItemEditor(props: {
  it: MyItem;
  trending: string[];
  // edit state
  editingItem: string | null;
  setEditingItem: (id: string | null) => void;
  editDesc: string; setEditDesc: (s: string) => void;
  editImg: string | null; setEditImg: (s: string | null) => void;
  editTags: string; setEditTags: (s: string) => void;
  // actions
  onSave: () => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  // validation
  violatedItem: string | null;
}) {
  const {
    it, trending,
    editingItem, setEditingItem,
    editDesc, setEditDesc,
    editImg, setEditImg,
    editTags, setEditTags,
    onSave, onDelete,
    violatedItem,
  } = props;

  const isEditing = editingItem === it.id;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmDelTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmDelete) {
      if (confirmDelTimerRef.current) window.clearTimeout(confirmDelTimerRef.current);
      confirmDelTimerRef.current = window.setTimeout(() => setConfirmDelete(false), 3000);
    }
    return () => {
      if (confirmDelTimerRef.current) window.clearTimeout(confirmDelTimerRef.current);
    };
  }, [confirmDelete]);

  return (
    <div className={`rounded-xl border p-4 bg-white dark:bg-gray-900 dark:border-gray-800 transition hover:shadow-md hover:-translate-y-0.5 overflow-hidden max-w-full ${ (it as any)?.suspended ? 'opacity-60 grayscale' : '' }`}>
      <div className="flex items-start gap-3">
        <Link href={spotlightHref(it.id)} prefetch={false} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 grid place-items-center">
          {it.imageUrl ? (
            <img src={it.imageUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={it.name} />
          ) : (
            <img src="/default-item.svg" alt="default" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          )}
        </Link>
        <div className="flex-1 min-w-0">
          {(it as any)?.suspended && (
            <div className="mb-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.335-.214 3.007-1.742 3.007H3.48c-1.528 0-2.492-1.672-1.742-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Askıda — yalnızca sen görüyorsun
            </div>
          )}
          <div className="flex items-center gap-2">
            <Link href={spotlightHref(it.id)} prefetch={false} className="text-base font-medium truncate break-words hover:underline">
              {it.name}
            </Link>

            <RatingPill avg={getAvg(it)} count={it.count ?? 0} />

            {it.edited && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">düzenlendi</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium">Açıklama</label>
              <textarea
                className={`w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700 ${violatedItem ? 'border-red-500 focus:ring-red-500' : ''}`}
                rows={3}
                value={editDesc}
                onChange={(e)=>setEditDesc(e.target.value)}
                placeholder="açıklama"
              />
              {violatedItem && (
                <div className="mt-1 text-xs text-red-600">
                  Bu metin yasaklı kelime içeriyor: “{violatedItem}”. Lütfen düzelt.
                </div>
              )}
              <div>
                <div className="text-sm font-medium mb-1">Etiketler</div>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e)=> setEditTags(e.target.value)}
                  placeholder="#kahve, #film veya kahve film"
                  className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                />
                <div className="mt-1 text-[11px] opacity-60">Virgülle ayırabilirsin.</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Görsel</div>
                <ImageUploader value={editImg ?? null} onChange={setEditImg} />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={()=>{ if (!violatedItem) onSave(); }}
                  disabled={!!violatedItem}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${violatedItem ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-black text-white'}`}
                  title={violatedItem ? 'Yasaklı kelime içeriyor' : 'Kaydet'}
                >
                  Kaydet
                </button>
                <button onClick={()=>setEditingItem(null)} className="px-3 py-1.5 rounded-lg border text-sm">Vazgeç</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm opacity-80 mt-1">{it.description}</p>
              {!!(it.tags && it.tags.length) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {it.tags.slice(0, 10).map(t => {
                    const isTrend = trending.includes(t);
                    return (
                      <span
                        key={t}
                        className={
                          'px-2 py-0.5 rounded-full text-xs border ' +
                          (isTrend
                            ? 'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700'
                            : 'bg-white dark:bg-gray-800 dark:border-gray-700')
                        }
                        title={isTrend ? 'Trend' : undefined}
                      >
                        #{t}
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2"
                  onClick={()=>{
                    setEditingItem(it.id);
                    // edit alanlarını doldur
                    setEditDesc(it.description || '');
                    setEditImg(it.imageUrl ?? null);
                    setEditTags((it.tags || []).join(', '));
                  }}
                  title="Düzenle"
                  aria-label="Düzenle"
                >
                  {/* pencil */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.862 3.487a1.875 1.875 0 0 1 2.651 2.651L8.9 16.75a4.5 4.5 0 0 1-1.897 1.128l-2.935.881a.75.75 0 0 1-.93-.93l.881-2.935A4.5 4.5 0 0 1 5.25 13.1L16.862 3.487Z"/><path d="M18.225 8.401l-2.626-2.626 1.06-1.06a.375.375 0 0 1 .53 0l2.096 2.096a.375.375 0 0 1 0 .53l-1.06 1.06Z"/></svg>
                  <span className="sr-only">Düzenle</span>
                </button>
                <ConfirmDeleteButton onConfirm={() => onDelete(it.id)} />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/* — İki tık onaylı sil butonu — */
function ConfirmDeleteButton({ onConfirm }: { onConfirm: () => void | Promise<void> }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmDelete) {
      if (tRef.current) window.clearTimeout(tRef.current);
      tRef.current = window.setTimeout(() => setConfirmDelete(false), 3000);
    }
    return () => { if (tRef.current) window.clearTimeout(tRef.current); };
  }, [confirmDelete]);

  return (
    <button
      className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 ${
        confirmDelete
          ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
          : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
      }`}
      onClick={async () => {
        if (confirmDelete) {
          await onConfirm();
          setConfirmDelete(false);
        } else {
          setConfirmDelete(true);
        }
      }}
      title={confirmDelete ? 'Onaylamak için tekrar tıkla' : 'Sil'}
      aria-label={confirmDelete ? 'Silmeyi onayla' : 'Sil'}
    >
      {confirmDelete ? (
        // check
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
      ) : (
        // trash
       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7l1-2h4l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
      )}
      <span className="sr-only">{confirmDelete ? 'Silmeyi onayla' : 'Sil'}</span>
    </button>
  );
}

/* — Basit yardımcı bileşenler — */
function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl border dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
      ))}
    </div>
  );
}