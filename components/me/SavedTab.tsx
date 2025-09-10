'use client';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import RatingPill from '@/components/common/RatingPill';
import Image from 'next/image';
import bookmarkSlash from '@/assets/icons/bookmarkslash.svg';
import ItemCard from '@/components/items/ItemCard';
import TagFilterBar from '@/components/common/TagFilterBar';
import Pager from '@/components/common/Pager';
import { useRouter } from 'next/navigation';

/** İsim maskeleme: "Burak Topaç" -> "B**** T****" */
function maskName(full?: string | null) {
  if (!full) return '';
  return full
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const chars = Array.from(part); // unicode güvenli
      if (chars.length <= 1) return part; // tek harfse bırak
      return chars[0] + '*'.repeat(chars.length - 1);
    })
    .join(' ');
}

/** — Tipler (MePage ile birebir uyum) — */
export type MyItem = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
    productUrl?: string | null;
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
    kind?: "REGULAR" | "BRAND" | string | null;
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
  const PER_PAGE = 8;
  const [page, setPage] = useState(1);

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

  // ItemCard için local state'ler
  const [openShareId, setOpenShareId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const router = useRouter();


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
  // Pagination derived values and effects
  const totalPages = Math.max(1, Math.ceil(filteredSaved.length / PER_PAGE));
  const pageStart = Math.min((page - 1) * PER_PAGE, Math.max(0, (totalPages - 1) * PER_PAGE));
  const pageItems = filteredSaved.slice(pageStart, pageStart + PER_PAGE);

  useEffect(() => { setPage(1); }, [localSaved.length, savedSelected.size]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  // Ana sayfadaki gibi: row‑major iki sütuna böl (1: sol, 2: sağ, 3: sol, 4: sağ ...)
  const [colLeft, colRight] = useMemo(() => {
    const L: MyItem[] = [];
    const R: MyItem[] = [];
    pageItems.forEach((it, idx) => ((idx % 2 === 0) ? L : R).push(it));
    return [L, R];
  }, [pageItems]);

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
            {/* Etiket filtresi — QuickAddCard tarzı */}
            {savedTags.length > 0 && (
              <div className="mb-3">
                <TagFilterBar
                  tags={savedTags}
                  trending={trending}
                  selected={savedSelected}
                  onToggle={(t) =>
                    setSavedSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      return next;
                    })
                  }
                  onClear={() => setSavedSelected(new Set())}
                />
              </div>
            )}

            {/* Kartlar — mobilde tek sütun (gerçek sıra), md+ iki sütun (row‑major) */}

            {/* MOBILE: tek sütun — pageItems sırasını aynen uygula */}
            <div className="md:hidden flex flex-col gap-5">
              {pageItems.map(it => (
                <div key={it.id}>
                  <ItemCard
                    item={it}
                    saved={true}
                    amAdmin={false}
                    myId={null}
                    openShareId={openShareId}
                    setOpenShareId={setOpenShareId}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    copiedShareId={copiedShareId ?? null}
                    onOpenSpotlight={(id) => router.push(spotlightHref(id))}
                    onToggleSave={(id) => {
                      // Saved tabde: kaydedilenden kaldır
                      setConfirmRemoveSaved(id);
                      removeSaved(id);
                    }}
                    onReport={(id) => onNotify?.('Raporlama bu ekranda devre dışı')}
                    onDelete={undefined}
                    onCopyShare={(id) => {
                      try {
                        navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                        setCopiedShareId(id);
                        onNotify?.('Bağlantı kopyalandı');
                        setTimeout(() => setCopiedShareId(null), 1500);
                      } catch {}
                    }}
                    onNativeShare={(id, name) => {
                      try {
                        if (navigator.share) {
                          navigator.share({ title: name, url: `${window.location.origin}/?item=${id}` });
                        } else {
                          navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                          onNotify?.('Bağlantı kopyalandı');
                        }
                      } catch {}
                    }}
                    onShowInList={() => {}}
                    onVoteComment={() => {}}
                    onItemChanged={undefined}
                    selectedTags={new Set<string>()}
                    onToggleTag={() => {}}
                    onResetTags={() => {}}
                    showComments={false}
                    showCommentBox={false}
                  />
                </div>
              ))}
            </div>

            {/* DESKTOP/TABLET: 2 sütun — bağımsız dikey akış, row‑major dağıtım */}
            <div className="hidden md:grid grid-cols-2 gap-5">
              {/* Sol sütun */}
              <div className="flex flex-col gap-5">
                {colLeft.map(it => (
                  <div key={it.id}>
                    <ItemCard
                      item={it}
                      saved={true}
                      amAdmin={false}
                      myId={null}
                      openShareId={openShareId}
                      setOpenShareId={setOpenShareId}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      copiedShareId={copiedShareId ?? null}
                      onOpenSpotlight={(id) => router.push(spotlightHref(id))}
                      onToggleSave={(id) => {
                        // Saved tabde: kaydedilenden kaldır
                        setConfirmRemoveSaved(id);
                        removeSaved(id);
                      }}
                      onReport={(id) => onNotify?.('Raporlama bu ekranda devre dışı')}
                      onDelete={undefined}
                      onCopyShare={(id) => {
                        try {
                          navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                          setCopiedShareId(id);
                          onNotify?.('Bağlantı kopyalandı');
                          setTimeout(() => setCopiedShareId(null), 1500);
                        } catch {}
                      }}
                      onNativeShare={(id, name) => {
                        try {
                          if (navigator.share) {
                            navigator.share({ title: name, url: `${window.location.origin}/?item=${id}` });
                          } else {
                            navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                            onNotify?.('Bağlantı kopyalandı');
                          }
                        } catch {}
                      }}
                      onShowInList={() => {}}
                      onVoteComment={() => {}}
                      onItemChanged={undefined}
                      selectedTags={new Set<string>()}
                      onToggleTag={() => {}}
                      onResetTags={() => {}}
                      showComments={false}
                      showCommentBox={false}
                    />
                  </div>
                ))}
              </div>
              {/* Sağ sütun */}
              <div className="flex flex-col gap-5">
                {colRight.map(it => (
                  <div key={it.id}>
                    <ItemCard
                      item={it}
                      saved={true}
                      amAdmin={false}
                      myId={null}
                      openShareId={openShareId}
                      setOpenShareId={setOpenShareId}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      copiedShareId={copiedShareId ?? null}
                      onOpenSpotlight={(id) => router.push(spotlightHref(id))}
                      onToggleSave={(id) => {
                        // Saved tabde: kaydedilenden kaldır
                        setConfirmRemoveSaved(id);
                        removeSaved(id);
                      }}
                      onReport={(id) => onNotify?.('Raporlama bu ekranda devre dışı')}
                      onDelete={undefined}
                      onCopyShare={(id) => {
                        try {
                          navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                          setCopiedShareId(id);
                          onNotify?.('Bağlantı kopyalandı');
                          setTimeout(() => setCopiedShareId(null), 1500);
                        } catch {}
                      }}
                      onNativeShare={(id, name) => {
                        try {
                          if (navigator.share) {
                            navigator.share({ title: name, url: `${window.location.origin}/?item=${id}` });
                          } else {
                            navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                            onNotify?.('Bağlantı kopyalandı');
                          }
                        } catch {}
                      }}
                      onShowInList={() => {}}
                      onVoteComment={() => {}}
                      onItemChanged={undefined}
                      selectedTags={new Set<string>()}
                      onToggleTag={() => {}}
                      onResetTags={() => {}}
                      showComments={false}
                      showCommentBox={false}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <Pager page={page} totalPages={totalPages} onPageChange={setPage} />
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