'use client';
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ItemCard from '@/components/home/ItemCard';
import { useRouter } from 'next/navigation';

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

  // Router and item card UI state
  const router = useRouter();
  const [openShareId, setOpenShareId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

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

  // Etiket filtresi: tek satır, oklarla sayfalı scroll (sığdığı kadar)
  const itemsTagsScrollRef = useRef<HTMLDivElement | null>(null);
  const [canPrevItemsTags, setCanPrevItemsTags] = useState(false);
  const [canNextItemsTags, setCanNextItemsTags] = useState(false);
  const [animItemsTags, setAnimItemsTags] = useState('');

  const syncItemsTagsEdges = useCallback(() => {
    const el = itemsTagsScrollRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setCanPrevItemsTags(!atStart);
    setCanNextItemsTags(!atEnd);
  }, []);

  const handlePrevItemsTags = useCallback(() => {
    const el = itemsTagsScrollRef.current;
    if (!el) return;
    setAnimItemsTags('rs-anim-left');
    el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
    window.setTimeout(() => setAnimItemsTags(''), 240);
  }, []);

  const handleNextItemsTags = useCallback(() => {
    const el = itemsTagsScrollRef.current;
    if (!el) return;
    setAnimItemsTags('rs-anim-right');
    el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
    window.setTimeout(() => setAnimItemsTags(''), 240);
  }, []);

  useEffect(() => {
    syncItemsTagsEdges();
    const el = itemsTagsScrollRef.current;
    if (!el) return;
    const on = () => syncItemsTagsEdges();
    el.addEventListener('scroll', on, { passive: true });
    const ro = new ResizeObserver(on);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', on); ro.disconnect(); };
  }, [syncItemsTagsEdges]);

  // Items with "add" card and row-major two-column split for desktop
  const itemsWithAdd = useMemo(() => [{ __add: true } as any, ...filteredItems], [filteredItems]);
  const [colLeft, colRight] = useMemo(() => {
    const L: any[] = []; const R: any[] = [];
    itemsWithAdd.forEach((it, idx) => ((idx % 2 === 0) ? L : R).push(it));
    return [L, R];
  }, [itemsWithAdd]);


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
              <div className="mb-3 relative">
                {/* Sol/sağ oklar */}
                {canPrevItemsTags && (
                  <button
                    type="button"
                    className="rs-sug-nav absolute left-0 top-1/2 -translate-y-1/2 z-10"
                    onClick={handlePrevItemsTags}
                    aria-label="Önceki"
                  >
                    <span className="sr-only">Önceki</span>
                    ‹
                  </button>
                )}
                {canNextItemsTags && (
                  <button
                    type="button"
                    className="rs-sug-nav absolute right-0 top-1/2 -translate-y-1/2 z-10"
                    onClick={handleNextItemsTags}
                    aria-label="Sonraki"
                  >
                    <span className="sr-only">Sonraki</span>
                    ›
                  </button>
                )}

                {/* Hepsi + taglar — tek satır, sayfalı scroll */}
                <div
                  ref={itemsTagsScrollRef}
                  className="overflow-x-auto no-scrollbar scroll-smooth px-8"
                  onScroll={syncItemsTagsEdges}
                >
                  <div className={`flex items-center gap-2 rs-sug-strip ${animItemsTags}`}>
                    <button
                      className={`px-2 py-1 rounded-full border text-xs shrink-0 snap-start ${
                        itemsSelected.size === 0
                          ? 'bg-black text-white border-black'
                          : 'bg-white dark:bg-gray-900 dark:border-gray-800'
                      }`}
                      onClick={() => setItemsSelected(new Set())}
                      onDoubleClick={() => setItemsSelected(new Set())}
                    >
                      Hepsi
                    </button>
                    {itemsTags.map((t) => {
                      const isSel = itemsSelected.has(t);
                      const isTrend = trending.includes(t);
                      const base = 'px-2 py-1 rounded-full border text-xs shrink-0 snap-start';
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
                            setItemsSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(t)) next.delete(t);
                              else next.add(t);
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
                </div>

                <style jsx>{`
                  .no-scrollbar::-webkit-scrollbar { display: none; }
                  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                  .rs-sug-nav { width: 32px; height: 32px; border-radius: 9999px; border: 1px solid var(--rs-bd, #e5e7eb); background: var(--rs-bg, #fff); color: var(--rs-fg, #111827); opacity: .9; }
                  .dark .rs-sug-nav { --rs-bg: rgba(17, 24, 39, .9); --rs-bd: #374151; --rs-fg: #e5e7eb; }
                  .rs-sug-nav:hover { transform: translateY(-50%) scale(1.02); }
                  .rs-sug-nav:active { transform: translateY(-50%) scale(.98); }
                  .rs-sug-strip { scroll-snap-type: x mandatory; }
                  @keyframes sugInLeft { from { opacity:.0; transform: translateX(-14px); } to { opacity:1; transform: translateX(0); } }
                  @keyframes sugInRight{ from { opacity:.0; transform: translateX(14px); }  to { opacity:1; transform: translateX(0); } }
                  .rs-anim-left { animation: sugInLeft .24s ease both; }
                  .rs-anim-right{ animation: sugInRight .24s ease both; }
                `}</style>
              </div>
            )}

            {/* Liste: Mobil/Tablet tek sütun (sıra korunur), lg+ iki sütun (masonry benzeri) */}

            {/* MOBILE+TABLET: tek sütun — gerçek sıra */}
            <div className="flex flex-col gap-5 lg:hidden">
              {itemsWithAdd.map((it: any, ix: number) => (
                it?.__add ? (
                  <Link
                    key={`add-m-${ix}`}
                    href="/#quick-add"
                    prefetch={false}
                    className="rounded-2xl border-2 border-emerald-300 p-4 shadow-sm bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40 grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition"
                    aria-label="Hızlı ekle"
                    title="Hızlı ekle"
                  >
                    <div className="flex flex-col items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <span className="text-4xl leading-none">+</span>
                      <span className="text-sm font-medium">Ekle</span>
                    </div>
                  </Link>
                ) : (
                  <div key={it.id}>
                    <ItemCard
                      item={it}
                      saved={false}
                      amAdmin={false}
                      myId={null}
                      showComments={false}
                      showCommentBox={false}
                      openShareId={openShareId}
                      setOpenShareId={setOpenShareId}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      copiedShareId={copiedShareId}
                      onOpenSpotlight={(id) => router.push(spotlightHref(id))}
                      onToggleSave={() => {}}
                      onReport={() => {}}
                      onDelete={undefined}
                      onCopyShare={(id) => {
                        try {
                          navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                          setCopiedShareId(id);
                          notify('Bağlantı kopyalandı');
                          setTimeout(() => setCopiedShareId(null), 1500);
                        } catch {}
                      }}
                      onNativeShare={(id, name) => {
                        try {
                          if (navigator.share) {
                            navigator.share({ title: name, url: `${window.location.origin}/?item=${id}` });
                          } else {
                            navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                            notify('Bağlantı kopyalandı');
                          }
                        } catch {}
                      }}
                      onShowInList={() => {}}
                      onVoteComment={() => {}}
                      onItemChanged={onReload}
                      selectedTags={itemsSelected}
                      onToggleTag={() => {}}
                      onResetTags={() => {}}
                    />
                  </div>
                )
              ))}
            </div>

            {/* DESKTOP: 2 sütun — bağımsız dikey akış, row‑major */}
            <div className="hidden lg:grid grid-cols-2 gap-5">
              {/* Sol sütun */}
              <div className="flex flex-col gap-5">
                {colLeft.map((it: any, ix: number) => (
                  it?.__add ? (
                    <Link
                      key={`add-left-${ix}`}
                      href="/#quick-add"
                      prefetch={false}
                      className="rounded-2xl border-2 border-emerald-300 p-4 shadow-sm bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40 grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition"
                      aria-label="Hızlı ekle"
                      title="Hızlı ekle"
                    >
                      <div className="flex flex-col items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <span className="text-4xl leading-none">+</span>
                        <span className="text-sm font-medium">Ekle</span>
                      </div>
                    </Link>
                  ) : (
                    <div key={it.id}>
                      <ItemCard
                        item={it}
                        saved={false}
                        amAdmin={false}
                        myId={null}
                        showComments={false}
                        showCommentBox={false}
                        openShareId={openShareId}
                        setOpenShareId={setOpenShareId}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        copiedShareId={copiedShareId}
                        onOpenSpotlight={(id) => router.push(spotlightHref(id))}
                        onToggleSave={() => {}}
                        onReport={() => {}}
                        onDelete={undefined}
                        onCopyShare={(id) => {
                          try {
                            navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                            setCopiedShareId(id);
                            notify('Bağlantı kopyalandı');
                            setTimeout(() => setCopiedShareId(null), 1500);
                          } catch {}
                        }}
                        onNativeShare={(id, name) => {
                          try {
                            if (navigator.share) {
                              navigator.share({ title: name, url: `${window.location.origin}/?item=${id}` });
                            } else {
                              navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                              notify('Bağlantı kopyalandı');
                            }
                          } catch {}
                        }}
                        onShowInList={() => {}}
                        onVoteComment={() => {}}
                        onItemChanged={onReload}
                        selectedTags={itemsSelected}
                        onToggleTag={() => {}}
                        onResetTags={() => {}}
                      />
                    </div>
                  )
                ))}
              </div>
              {/* Sağ sütun */}
              <div className="flex flex-col gap-5">
                {colRight.map((it: any, ix: number) => (
                  it?.__add ? (
                    <Link
                      key={`add-right-${ix}`}
                      href="/#quick-add"
                      prefetch={false}
                      className="rounded-2xl border-2 border-emerald-300 p-4 shadow-sm bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40 grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition"
                      aria-label="Hızlı ekle"
                      title="Hızlı ekle"
                    >
                      <div className="flex flex-col items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <span className="text-4xl leading-none">+</span>
                        <span className="text-sm font-medium">Ekle</span>
                      </div>
                    </Link>
                  ) : (
                    <div key={it.id}>
                      <ItemCard
                        item={it}
                        saved={false}
                        amAdmin={false}
                        myId={null}
                        showComments={false}
                        showCommentBox={false}
                        openShareId={openShareId}
                        setOpenShareId={setOpenShareId}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        copiedShareId={copiedShareId}
                        onOpenSpotlight={(id) => router.push(spotlightHref(id))}
                        onToggleSave={() => {}}
                        onReport={() => {}}
                        onDelete={undefined}
                        onCopyShare={(id) => {
                          try {
                            navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                            setCopiedShareId(id);
                            notify('Bağlantı kopyalandı');
                            setTimeout(() => setCopiedShareId(null), 1500);
                          } catch {}
                        }}
                        onNativeShare={(id, name) => {
                          try {
                            if (navigator.share) {
                              navigator.share({ title: name, url: `${window.location.origin}/?item=${id}` });
                            } else {
                              navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                              notify('Bağlantı kopyalandı');
                            }
                          } catch {}
                        }}
                        onShowInList={() => {}}
                        onVoteComment={() => {}}
                        onItemChanged={onReload}
                        selectedTags={itemsSelected}
                        onToggleTag={() => {}}
                        onResetTags={() => {}}
                      />
                    </div>
                  )
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
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