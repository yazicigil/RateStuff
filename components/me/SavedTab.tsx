'use client';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import RatingPill from '@/components/common/RatingPill';
import Image from 'next/image';
import bookmarkSlash from '@/assets/icons/bookmarkslash.svg';
import ItemCard from '@/components/home/ItemCard';
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
  // Ana sayfadaki gibi: row‑major iki sütuna böl (1: sol, 2: sağ, 3: sol, 4: sağ ...)
  const [colLeft, colRight] = useMemo(() => {
    const L: MyItem[] = [];
    const R: MyItem[] = [];
    filteredSaved.forEach((it, idx) => {
      (idx % 2 === 0 ? L : R).push(it);
    });
    return [L, R];
  }, [filteredSaved]);

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
                <TagPager
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

            {/* MOBILE: tek sütun — filteredSaved sırasını aynen uygula */}
            <div className="md:hidden flex flex-col gap-5">
              {filteredSaved.map(it => (
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
// TagPager component (reusable)
function TagPager({
  tags,
  trending,
  selected,
  onToggle,
  onClear,
}: {
  tags: string[];
  trending: string[];
  selected: Set<string>;
  onToggle: (t: string) => void;
  onClear: () => void;
}) {
  const [page, setPage] = React.useState(0);
  const [pages, setPages] = React.useState<string[][]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const measureRef = React.useRef<HTMLDivElement | null>(null);

  // Build pages to fit as many chips as the container can hold (responsive)
  const rebuildPages = React.useCallback(() => {
    const root = containerRef.current;
    const meas = measureRef.current;
    if (!root || !meas) return;

    const contentWidth = root.clientWidth; // width of row content area (inside px-12)

    // Create measurables: Hepsi + each tag as a chip with exact classes
    meas.innerHTML = '';
    // Hepsi button
    const hepsi = document.createElement('button');
    hepsi.className = 'h-8 px-3 py-0 rounded-full border text-xs shrink-0';
    hepsi.textContent = 'Hepsi';
    meas.appendChild(hepsi);
    const hepsiW = hepsi.getBoundingClientRect().width;

    // gap between items is gap-2 => 0.5rem (~8px). Read from computed style for safety
    const gapPx = 8; // tailwind gap-2

    // Available width for chips = contentWidth - (left+right padding used by px-12) - Hepsi - a single gap between Hepsi and first chip
    // We are inside a row with padding already applied externally. Here, we measure inside containerRef which is the row (no extra padding), so only subtract Hepsi and first gap.
    const avail = Math.max(0, contentWidth - hepsiW - gapPx);

    // Measure each tag chip width
    const chipWidths: number[] = [];
    const makeChip = (label: string, isTrend: boolean, isSel: boolean) => {
      const base = 'inline-flex items-center gap-1 h-8 px-3 py-0 rounded-full border text-xs shrink-0';
      const className = isSel
        ? isTrend
          ? `${base} bg-violet-600 text-white border-violet-600`
          : `${base} bg-black text-white border-black`
        : isTrend
          ? `${base} bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700`
          : `${base} bg-white dark:bg-gray-900 dark:border-gray-800`;
      const btn = document.createElement('button');
      btn.className = className;
      btn.innerHTML = `<span>#${label}</span>`;
      return btn;
    };

    tags.forEach((t) => {
      const isSel = selected.has(t);
      const isTrend = trending.includes(t);
      const el = makeChip(t, isTrend, isSel);
      meas.appendChild(el);
      const w = el.getBoundingClientRect().width;
      chipWidths.push(w);
    });

    // Pack chips into pages based on available width and gap
    const newPages: string[][] = [];
    let i = 0;
    while (i < tags.length) {
      let used = 0; // width used by chips on this page
      const pageTags: string[] = [];
      while (i < tags.length) {
        const w = chipWidths[i];
        const nextUsed = pageTags.length === 0 ? w : used + gapPx + w;
        if (nextUsed <= avail) {
          used = nextUsed;
          pageTags.push(tags[i]);
          i++;
        } else {
          break;
        }
      }
      if (pageTags.length === 0) {
        // Fallback to avoid infinite loop on extremely narrow widths
        pageTags.push(tags[i]);
        i++;
      }
      newPages.push(pageTags);
    }

    setPages(newPages);
    // Reset page to 0 if current page overflows
    setPage((p) => (p >= newPages.length ? 0 : p));
  }, [tags, trending, selected]);

  // Rebuild on mount and when deps/size change
  React.useEffect(() => {
    rebuildPages();
    const ro = new ResizeObserver(() => rebuildPages());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [rebuildPages]);

  // If selected tags are not visible in current page, jump to the first page
  React.useEffect(() => {
    if (!pages.length) return;
    const visible = new Set(pages[page] || []);
    const anyVisible = Array.from(selected).some((t) => visible.has(t));
    if (!anyVisible && selected.size > 0) setPage(0);
  }, [pages, page, selected]);

  const canPrev = page > 0;
  const canNext = page < Math.max(0, pages.length - 1);
  const visibleTags = pages[page] || tags.slice(0, 1);

  return (
    <div className="relative">
      {/* hidden measurer */}
      <div ref={measureRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }} />

      {/* Oklar */}
      {canPrev && (
        <button
          type="button"
          className="rs-sug-nav absolute left-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          aria-label="Önceki"
        >
          ‹
        </button>
      )}
      {canNext && (
        <button
          type="button"
          className="rs-sug-nav absolute right-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
          aria-label="Sonraki"
        >
          ›
        </button>
      )}

      {/* İçerik (Hepsi + görünür chipler) */}
      <div className="pr-12 min-h-[32px] transition-[padding] duration-150 ease-out" ref={containerRef} style={{ paddingLeft: canPrev ? 48 : 0 }}>
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            className={`h-8 px-3 py-0 rounded-full border text-xs shrink-0 ${
              selected.size === 0
                ? 'bg-black text-white border-black'
                : 'bg-white dark:bg-gray-900 dark:border-gray-800'
            }`}
            onClick={onClear}
            onDoubleClick={onClear}
          >
            Hepsi
          </button>

          {/* sayfa animasyonu */}
          <div key={`page-${page}`} className="flex items-center gap-2 animate-[sugIn_.22s_ease_both]">
            {visibleTags.map((t) => {
              const isSel = selected.has(t);
              const isTrend = trending.includes(t);
              const base = 'inline-flex items-center gap-1 h-8 px-3 py-0 rounded-full border text-xs shrink-0';
              const className = isSel
                ? isTrend
                  ? `${base} bg-violet-600 text-white border-violet-600`
                  : `${base} bg-black text-white border-black`
                : isTrend
                  ? `${base} bg-violet-100 text-violet-900 border-violet-300 hover:bg-violet-200 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-800/60`
                  : `${base} bg-white dark:bg-gray-900 dark:border-gray-800`;
              return (
                <button
                  key={t}
                  className={className}
                  onClick={() => onToggle(t)}
                  title={isSel ? 'Filtreden kaldır' : 'Filtreye ekle'}
                >
                  <span>#{t}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes sugIn { from { opacity:.0; transform: translateX(8px); } to { opacity:1; transform: translateX(0); } }
        .rs-sug-nav { width: 32px; height: 32px; border-radius: 9999px; border: 1px solid var(--rs-bd, #e5e7eb); background: var(--rs-bg, #fff); color: var(--rs-fg, #111827); opacity: .95; z-index: 10; pointer-events: auto; }
        .dark .rs-sug-nav { --rs-bg: rgba(17, 24, 39, .92); --rs-bd: #374151; --rs-fg: #e5e7eb; }
        .rs-sug-nav:hover { transform: translateY(-50%) scale(1.02); }
        .rs-sug-nav:active { transform: translateY(-50%) scale(.98); }
      `}</style>
    </div>
  );
}