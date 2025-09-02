'use client';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import RatingPill from '@/components/common/RatingPill';
import Image from 'next/image';
import bookmarkSlash from '@/public/assets/icons/bookmarkslash.svg';

/** — Tipler (MePage ile birebir uyum) — */
export type MyItem = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  avg: number | null;
  avgRating?: number | null; // eski/yeni payload uyumu
  count?: number;
  edited?: boolean;
  suspended?: boolean;
  tags?: string[];
  createdBy?: {
    id: string;
    name?: string | null;
    maskedName?: string | null;
    avatarUrl?: string | null;
  } | null;
  createdByName?: string | null;
  createdByAvatarUrl?: string | null;
};

function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
    </svg>
  );
}

/** — Ortalama okuma helper’ı: ana sayfadaki gibi avgRating ?? avg — */
const getAvg = (x: { avg?: number | null; avgRating?: number | null } | null | undefined) =>
  (x as any)?.avgRating ?? (x as any)?.avg ?? null;

const spotlightHref = (id: string) => `/?item=${id}`;

export default function SavedTab({
  saved,
  trending,
  loading,
  error = null,
  onNotify,                       // toast için parent’tan fonksiyon
  onSavedChange,                  // parent state’ini senkron tutmak istersen
}: {
  saved: MyItem[];
  trending: string[];
  loading: boolean;
  error?: string | null;
  onNotify: (msg: string) => void;
  onSavedChange?: (next: MyItem[]) => void;
}) {
  /** Local kopya: parent değiştikçe sync, remove’da optimistic update */
  const [localSaved, setLocalSaved] = useState<MyItem[]>(saved);
  useEffect(() => { setLocalSaved(saved); }, [saved]);

  /** Etiket filtresi */
  const [savedSelected, setSavedSelected] = useState<Set<string>>(new Set());

  /** İki adımlı kaldır onayı */
  const [confirmRemoveSaved, setConfirmRemoveSaved] = useState<string | null>(null);
  const confirmSavedTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmRemoveSaved) {
      if (confirmSavedTimerRef.current) window.clearTimeout(confirmSavedTimerRef.current);
      confirmSavedTimerRef.current = window.setTimeout(() => setConfirmRemoveSaved(null), 3000);
    }
    return () => {
      if (confirmSavedTimerRef.current) window.clearTimeout(confirmSavedTimerRef.current);
    };
  }, [confirmRemoveSaved]);

  // dışarı tıklayınca onayı kapat
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-saved-remove-btn]')) {
        setConfirmRemoveSaved(null);
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, []);

  /** Türev veriler */
  const savedTags = useMemo(() => {
    const s = new Set<string>();
    for (const it of localSaved) (it.tags || []).forEach(t => s.add(t));
    return Array.from(s).sort();
  }, [localSaved]);

  const filteredSaved = useMemo(() => {
    if (savedSelected.size === 0) return localSaved;
    return localSaved.filter(it => {
      const tags = new Set(it.tags || []);
      for (const t of savedSelected) if (!tags.has(t)) return false;
      return true;
    });
  }, [localSaved, savedSelected]);

  /** BE: Kaydedilenden kaldır (optimistic) */
  const removeSaved = useCallback(async (itemId: string) => {
    // optimistic
    setLocalSaved(prev => prev.filter(x => x.id !== itemId));
    onSavedChange?.(localSaved.filter(x => x.id !== itemId));
    try {
      const r = await fetch(`/api/items/${itemId}/save`, { method: 'DELETE' });
      const j = await r.json().catch(() => null);
      if (j?.ok) {
        onNotify('Kaydedilenden kaldırıldı');
      } else {
        throw new Error(j?.error || String(r.status));
      }
    } catch (e) {
      // rollback (parent’tan gelen truth yoksa eldekiyle geri al)
      setLocalSaved(prev => {
        const removed = saved.find(x => x.id === itemId);
        return removed ? [removed, ...prev] : prev;
      });
      onSavedChange?.(saved);
      alert('Hata: kaldırılamadı.');
    } finally {
      setConfirmRemoveSaved(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNotify, onSavedChange, saved, localSaved]);

  return (
    <section className="fade-slide-in rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="px-4 pb-4 pt-3 space-y-3">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <Skeleton rows={4} />
        ) : localSaved.length === 0 ? (
          <Box>Henüz yok.</Box>
        ) : (
          <>
            {/* Etiket filtresi */}
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

            {/* Kartlar */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredSaved.map(it => (
                <div
                  key={it.id}
                  className={
                    "rounded-xl border p-4 bg-white dark:bg-gray-900 dark:border-gray-800 transition hover:shadow-md hover:-translate-y-0.5 overflow-hidden max-w-full" +
                    `${(it as any)?.suspended ? ' opacity-60 grayscale' : ''}`
                  }
                >
                  <div className="flex items-start gap-3">
                    <Link href={spotlightHref(it.id)} prefetch={false} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 grid place-items-center">
                      {it.imageUrl ? (
                        <img src={it.imageUrl} alt={it.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <img src="/default-item.svg" alt="default" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        {/* Sol: isim + ortalama pill */}
                        <div className="min-w-0 flex items-center gap-2">
                          <Link href={spotlightHref(it.id)} prefetch={false} className="text-base font-medium truncate break-words hover:underline">
                            {it.name}
                          </Link>
                          <RatingPill avg={getAvg(it)} count={it.count ?? 0} />
                        </div>

                        {/* Sağ: kaldır butonu (iki adım onay) */}
                        <button
                          type="button"
                          onMouseDown={(e: React.MouseEvent) => { e.stopPropagation(); }}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const isConfirming = confirmRemoveSaved === it.id;
                            if (isConfirming) {
                              removeSaved(it.id);
                            } else {
                              setConfirmRemoveSaved(it.id);
                            }
                          }}
                          data-saved-remove-btn
                          className={`text-xs px-2 py-1 rounded-lg border flex items-center gap-1 ${
                            confirmRemoveSaved === it.id
                              ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
                              : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                          }`}
                          title={confirmRemoveSaved === it.id ? 'Onaylamak için tekrar tıkla' : 'Kaydedilenlerden kaldır'}
                          aria-label={confirmRemoveSaved === it.id ? 'Kaldırmayı onayla' : 'Kaydedilenlerden kaldır'}
                        >
                          <span data-saved-remove-btn className="inline-flex items-center gap-1">
                            {confirmRemoveSaved === it.id ? (
                              <IconCheck className="w-4 h-4" />
                            ) : (
                              <Image src={bookmarkSlash} alt="remove" width={16} height={16} className="text-red-600 dark:text-red-400" />
                            )}
                          </span>
                        </button>
                      </div>

                      {/* Suspended badge */}
                      {(it as any)?.suspended && (
                        <div className="mb-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.335-.214 3.007-1.742 3.007H3.48c-1.528 0-2.492-1.672-1.742-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Askıda — yalnızca sen görüyorsun
                        </div>
                      )}

                      <p className="text-sm opacity-80 mt-1 line-clamp-3 break-words">{it.description}</p>

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

                      {/* Ekleyen kişi */}
                      {(() => {
                        const by = it.createdBy || null;
                        const avatar = by?.avatarUrl ?? it.createdByAvatarUrl ?? null;
                        const displayName = by?.maskedName ?? by?.name ?? it.createdByName ?? null;
                        if (!avatar && !displayName) return null;
                        return (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="opacity-60">Ekleyen:</span>
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-grid place-items-center w-5 h-5 rounded-full overflow-hidden bg-gray-200 text-[10px] font-semibold">
                                {avatar ? (
                                  <img src={avatar} alt={displayName ?? 'ekleyen'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white">
                                    {(displayName || 'A')
                                      .split(' ')
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .map(s => (s[0] || '').toUpperCase())
                                      .join('') || 'A'}
                                  </span>
                                )}
                              </span>
                              <span className="truncate max-w-[12rem]">{displayName || 'Anonim'}</span>
                            </span>
                          </div>
                        );
                      })()}

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
      </div>
    </section>
  );
}

/* — Basit yardımcılar (MePage ile uyumlu görünsün diye) — */
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