'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ItemCard from '@/components/home/ItemCard';
import QuickAddCard from '@/components/home/QuickAddCard';
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
  createdBy?: {
    id?: string;
    name?: string | null;
    maskedName?: string | null;
    avatarUrl?: string | null;
    kind?: "REGULAR" | "BRAND" | string | null;
  } | null;
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
  onReload,
  bannedWords,
  myId,            // <-- eklendi
  amAdmin,         // <-- eklendi
  isBrandProfile = false,  // <-- yeni
}: {
  items: MyItem[];
  trending: string[];
  loading: boolean;
  notify?: (msg: string) => void;
  onReload?: () => void | Promise<void>;
  bannedWords?: string[];
  myId?: string | null;    // <-- eklendi
  amAdmin?: boolean;       // <-- eklendi
  isBrandProfile?: boolean; // <-- yeni
}) {
  const [itemsSelected, setItemsSelected] = useState<Set<string>>(new Set());

  // Router and item card UI state
  const router = useRouter();
  const [openShareId, setOpenShareId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  // Optimistic removal for delete
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Brand theme detection
  const [brandTheme, setBrandTheme] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const compute = () => {
      const cs = getComputedStyle(root);
      const a = cs.getPropertyValue('--brand-accent').trim();
      const b = cs.getPropertyValue('--brand-items-bg').trim();
      setBrandTheme(Boolean(a || b));
    };
    compute();
    const mo = new MutationObserver(compute);
    mo.observe(root, { attributes: true, attributeFilter: ['style'] });
    return () => mo.disconnect();
  }, []);

  const notifyFn = React.useCallback((msg: string) => {
    try {
      if (typeof notify === 'function') return notify(msg);
      (window as any)?.toast?.(msg);
      console.log(msg);
    } catch {
      // no-op
    }
  }, [notify]);

  const handleQuickAddSubmit = useCallback(async (payload: {
    name: string;
    desc: string;
    tags: string[];
    rating: number;
    comment: string;
    imageUrl: string | null;
  }) => {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          description: payload.desc,
          tags: payload.tags,
          rating: payload.rating,
          comment: payload.comment,
          imageUrl: payload.imageUrl,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Eklenemedi');
        notifyFn(msg || 'Eklenemedi');
        return false;
      }
      notifyFn('Eklendi');
      await onReload?.();
      return true; // QuickAddCard form reset + toast için
    } catch (e: any) {
      notifyFn(e?.message || 'Hata oluştu');
      return false;
    }
  }, [notifyFn, onReload]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      // optimistic: hide immediately
      setRemovedIds(prev => {
        const n = new Set(prev);
        n.add(id);
        return n;
      });

      const res = await fetch(`/api/items/${id}/delete`, { method: 'POST' });
      if (!res.ok) {
        // revert on failure
        setRemovedIds(prev => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        const txt = await res.text().catch(() => 'Silinemedi');
        throw new Error(txt || 'Silinemedi');
      }

      notifyFn('Gönderi silindi');
      await onReload?.();
    } catch (e: any) {
      notifyFn(e?.message || 'Hata oluştu');
    }
  }, [notifyFn, onReload]);

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


  // Items with "add" card and row-major two-column split for desktop
  const itemsWithAdd = useMemo(() => [{ __add: true } as any, ...filteredItems], [filteredItems]);
  const [colLeft, colRight] = useMemo(() => {
    const L: any[] = []; const R: any[] = [];
    itemsWithAdd.forEach((it, idx) => ((idx % 2 === 0) ? L : R).push(it));
    return [L, R];
  }, [itemsWithAdd]);


  return (
    <section
      className="fade-slide-in rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
      style={{
        backgroundColor: 'var(--brand-items-bg, transparent)'
      }}
    >
      <div className="px-4 pb-4 pt-3 space-y-3">
        {loading ? (
          <Skeleton rows={4} />
        ) : items.length === 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {(isBrandProfile || brandTheme) ? (
              <QuickAddCard
                onSubmit={handleQuickAddSubmit}
                trending={trending}
                allTags={itemsTags}
                variant="rich"
                signedIn={!!myId}
                signInHref="/signin"
                prefill={{ tags: Array.from(itemsSelected).slice(0, 3) }}
                isBrandProfile
              />
            ) : (
              <Link
                href="/#quick-add"
                prefetch={false}
                className={`rounded-2xl border-2 p-4 shadow-sm grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition ${brandTheme ? '' : 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40'}`}
                style={brandTheme ? { backgroundColor: 'var(--brand-elev-strong)', borderColor: 'var(--brand-elev-bd)' } : undefined}
                aria-label="Hızlı ekle"
                title="Hızlı ekle"
              >
                <div className={`flex flex-col items-center gap-2 ${brandTheme ? '' : 'text-emerald-700 dark:text-emerald-300'}`} style={brandTheme ? { color: 'var(--brand-ink)' } : undefined}>
                  <span className="text-5xl leading-none">+</span>
                  <span className="text-base font-medium">Ekle</span>
                </div>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Tag filter — QuickAddCard tarzı: 4'lük sayfa, oklar, + ikonlu chip, dots */}
            {itemsTags.length > 0 && (
              <div className="mb-3">
                <TagPager
                  tags={itemsTags}
                  trending={trending}
                  selected={itemsSelected}
                  onToggle={(t) =>
                    setItemsSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      return next;
                    })
                  }
                  onClear={() => setItemsSelected(new Set())}
                  brandTheme={brandTheme}
                />
              </div>
            )}

            {/* Liste: Mobil/Tablet tek sütun (sıra korunur), lg+ iki sütun (masonry benzeri) */}

            {/* MOBILE+TABLET: tek sütun — gerçek sıra */}
            <div className="flex flex-col gap-5 lg:hidden">
              {itemsWithAdd.map((it: any, ix: number) => (
                it?.__add ? (
                  (isBrandProfile || brandTheme) ? (
                    <QuickAddCard
                      key={`add-m-${ix}`}
                      onSubmit={handleQuickAddSubmit}
                      trending={trending}
                      allTags={itemsTags}
                      variant="compact"
                      signedIn={!!myId}
                      signInHref="/signin"
                      prefill={{ tags: Array.from(itemsSelected).slice(0, 3) }}
                      isBrandProfile
                    />
                  ) : (
                    <Link
                      key={`add-m-${ix}`}
                      href="/#quick-add"
                      prefetch={false}
                      className={`rounded-2xl border-2 p-4 shadow-sm grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition ${brandTheme ? '' : 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40'}`}
                      style={brandTheme ? { backgroundColor: 'var(--brand-elev-strong)', borderColor: 'var(--brand-elev-bd)' } : undefined}
                      aria-label="Hızlı ekle"
                      title="Hızlı ekle"
                    >
                      <div className={`flex flex-col items-center gap-2 ${brandTheme ? '' : 'text-emerald-700 dark:text-emerald-300'}`} style={brandTheme ? { color: 'var(--brand-ink)' } : undefined}>
                        <span className="text-4xl leading-none">+</span>
                        <span className="text-sm font-medium">Ekle</span>
                      </div>
                    </Link>
                  )
                ) : removedIds.has(it.id) ? null : (
                  <div key={it.id}>
                    <ItemCard
                      item={it}
                      saved={false}
                      amAdmin={!!amAdmin}
                      myId={myId ?? null}
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
                      onDelete={handleDelete}
                      onCopyShare={(id) => {
                        try {
                          navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                          setCopiedShareId(id);
                          notifyFn('Bağlantı kopyalandı');
                          setTimeout(() => setCopiedShareId(null), 1500);
                        } catch {}
                      }}
                      onNativeShare={(id, name) => {
                        try {
                          if (navigator.share) {
                            navigator.share({ title: name, url: `${window.location.origin}/?item=${id}` });
                          } else {
                            navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                            notifyFn('Bağlantı kopyalandı');
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
                    (isBrandProfile || brandTheme) ? (
                      <QuickAddCard
                        key={`add-left-${ix}`}
                        onSubmit={handleQuickAddSubmit}
                        trending={trending}
                        allTags={itemsTags}
                        variant="compact"
                        signedIn={!!myId}
                        signInHref="/signin"
                        prefill={{ tags: Array.from(itemsSelected).slice(0, 3) }}
                        isBrandProfile
                      />
                    ) : (
                      <Link
                        key={`add-left-${ix}`}
                        href="/#quick-add"
                        prefetch={false}
                        className={`rounded-2xl border-2 p-4 shadow-sm grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition ${brandTheme ? '' : 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40'}`}
                        style={brandTheme ? { backgroundColor: 'var(--brand-elev-strong)', borderColor: 'var(--brand-elev-bd)' } : undefined}
                        aria-label="Hızlı ekle"
                        title="Hızlı ekle"
                      >
                        <div className={`flex flex-col items-center gap-2 ${brandTheme ? '' : 'text-emerald-700 dark:text-emerald-300'}`} style={brandTheme ? { color: 'var(--brand-ink)' } : undefined}>
                          <span className="text-4xl leading-none">+</span>
                          <span className="text-sm font-medium">Ekle</span>
                        </div>
                      </Link>
                    )
                  ) : removedIds.has(it.id) ? null : (
                    <div key={it.id}>
                      <ItemCard
                        item={it}
                        saved={false}
                        amAdmin={!!amAdmin}
                        myId={myId ?? null}
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
                        onDelete={handleDelete}
                        onCopyShare={(id) => {
                          try {
                            navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                            setCopiedShareId(id);
                            notifyFn('Bağlantı kopyalandı');
                            setTimeout(() => setCopiedShareId(null), 1500);
                          } catch {}
                        }}
                        onNativeShare={(id, name) => {
                          try {
                            if (navigator.share) {
                              navigator.share({ title: name, url: `${window.location.origin}/?item=${id}` });
                            } else {
                              navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                              notifyFn('Bağlantı kopyalandı');
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
                    (isBrandProfile || brandTheme) ? (
                      <QuickAddCard
                        key={`add-right-${ix}`}
                        onSubmit={handleQuickAddSubmit}
                        trending={trending}
                        allTags={itemsTags}
                        variant="compact"
                        signedIn={!!myId}
                        signInHref="/signin"
                        prefill={{ tags: Array.from(itemsSelected).slice(0, 3) }}
                        isBrandProfile
                      />
                    ) : (
                      <Link
                        key={`add-right-${ix}`}
                        href="/#quick-add"
                        prefetch={false}
                        className={`rounded-2xl border-2 p-4 shadow-sm grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition ${brandTheme ? '' : 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40'}`}
                        style={brandTheme ? { backgroundColor: 'var(--brand-elev-strong)', borderColor: 'var(--brand-elev-bd)' } : undefined}
                        aria-label="Hızlı ekle"
                        title="Hızlı ekle"
                      >
                        <div className={`flex flex-col items-center gap-2 ${brandTheme ? '' : 'text-emerald-700 dark:text-emerald-300'}`} style={brandTheme ? { color: 'var(--brand-ink)' } : undefined}>
                          <span className="text-4xl leading-none">+</span>
                          <span className="text-sm font-medium">Ekle</span>
                        </div>
                      </Link>
                    )
                  ) : removedIds.has(it.id) ? null : (
                    <div key={it.id}>
                      <ItemCard
                        item={it}
                        saved={false}
                        amAdmin={!!amAdmin}
                        myId={myId ?? null}
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
                        onDelete={handleDelete}
                        onCopyShare={(id) => {
                          try {
                            navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                            setCopiedShareId(id);
                            notifyFn('Bağlantı kopyalandı');
                            setTimeout(() => setCopiedShareId(null), 1500);
                          } catch {}
                        }}
                        onNativeShare={(id, name) => {
                          try {
                            if (navigator.share) {
                              navigator.share({ title: name, url: `${window.location.origin}/?item=${id}` });
                            } else {
                              navigator.clipboard?.writeText(`${window.location.origin}/?item=${id}`);
                              notifyFn('Bağlantı kopyalandı');
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

function TagPager({
  tags,
  trending,
  selected,
  onToggle,
  onClear,
  brandTheme = false,
}: {
  tags: string[];
  trending: string[];
  selected: Set<string>;
  onToggle: (t: string) => void;
  onClear: () => void;
  brandTheme?: boolean;
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
            className={`h-8 px-3 py-0 rounded-full border text-xs shrink-0 ${brandTheme ? '' : (selected.size === 0 ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-900 dark:border-gray-800')}`}
            onClick={onClear}
            onDoubleClick={onClear}
            style={ brandTheme ? (
              selected.size === 0
                ? { backgroundColor: 'var(--brand-elev-strong)', borderColor: 'var(--brand-elev-bd)', color: 'var(--brand-ink)' }
                : { backgroundColor: 'var(--brand-elev-bg)',     borderColor: 'var(--brand-elev-bd)', color: 'var(--brand-ink)' }
            ) : undefined }
          >
            Hepsi
          </button>

          {/* sayfa animasyonu */}
          <div key={`page-${page}`} className="flex items-center gap-2 animate-[sugIn_.22s_ease_both]">
            {visibleTags.map((t) => {
              const isSel = selected.has(t);
              return (
                <button
                  key={t}
                  className={`inline-flex items-center gap-1 h-8 px-3 py-0 rounded-full border text-xs shrink-0 ${brandTheme ? '' : (isSel ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-900 dark:border-gray-800')}`}
                  onClick={() => onToggle(t)}
                  title={isSel ? 'Filtreden kaldır' : 'Filtreye ekle'}
                  style={ brandTheme ? (
                    isSel
                      ? { backgroundColor: 'var(--brand-elev-strong)', borderColor: 'var(--brand-elev-bd)', color: 'var(--brand-ink)' }
                      : { backgroundColor: 'var(--brand-elev-bg)',     borderColor: 'var(--brand-elev-bd)', color: 'var(--brand-ink)' }
                  ) : undefined }
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
        .rs-sug-nav { width: 32px; height: 32px; border-radius: 9999px; border: 1px solid var(--rs-bd, var(--brand-accent-bd, #e5e7eb)); background: var(--rs-bg, var(--brand-chip-bg, #fff)); color: var(--rs-fg, var(--brand-ink, #111827)); opacity: .95; z-index: 10; pointer-events: auto; }
        .dark .rs-sug-nav { --rs-bg: rgba(17, 24, 39, .92); --rs-bd: #374151; --rs-fg: #e5e7eb; }
        .rs-sug-nav:hover { transform: translateY(-50%) scale(1.02); }
        .rs-sug-nav:active { transform: translateY(-50%) scale(.98); }
      `}</style>
    </div>
  );
}