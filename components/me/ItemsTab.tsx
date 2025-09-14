'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ItemCard from '@/components/items/ItemCard';
import QuickAddCard from '@/components/home/QuickAddCard';
import TagFilterBar from '@/components/common/TagFilterBar';
import Pager from '@/components/common/Pager';
import { useRouter } from 'next/navigation';

/** — Tipler — */
export type MyItem = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
    productUrl?: string | null; // brand CTA için
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
  hideAdd = false,            // <-- yeni
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
  hideAdd?: boolean;
}) {
  // Local state for optimistic items
  const [itemsLocal, setItemsLocal] = useState<MyItem[]>(items);
  useEffect(() => { setItemsLocal(items); }, [items]);
  const [itemsSelected, setItemsSelected] = useState<Set<string>>(new Set());
  const PER_PAGE = 8;
  const [page, setPage] = useState(1);

  // Router and item card UI state
  const router = useRouter();
  const [openShareId, setOpenShareId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  // Quick add open/close (for brand profiles)
  const [qaOpen, setQaOpen] = useState(false);

  // Optimistic removal for delete
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());


  // Infer list owner from items (first item with a creator id)
  const listOwnerId = useMemo(() => {
    for (const it of itemsLocal) {
      const cid = it?.createdBy?.id;
      if (cid) return cid;
    }
    return null as string | null;
  }, [itemsLocal]);

  // We no longer hide the Add card: it is always visible regardless of page or ownership
  const isOwnList = useMemo(() => !!myId && !!listOwnerId && myId === listOwnerId, [myId, listOwnerId]);
  const isPublicBrandPage = false; // previously used to hide Add on /brand/[slug]
  const effectiveHideAdd = false;  // force-show Add card in all cases
  const canShowAdd = true;         // always inject the Add card


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
      productUrl: string | null; // <-- yeni

  }) => {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          description: payload.desc ?? '',
          tagsCsv: (payload.tags ?? []).join(','),
          rating: payload.rating,
          comment: payload.comment,
          imageUrl: payload.imageUrl ?? null,
          productUrl: payload.productUrl ?? null,
          createdById: myId ?? undefined,
          source: 'me-quickadd',
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Eklenemedi');
        notifyFn(msg || 'Eklenemedi');
        return false;
      }
      const created = await res.json().catch(() => null);
      if (created && created.id) {
        setItemsLocal(prev => [created as MyItem, ...prev]);
      }
      notifyFn('Eklendi');
      // Arka planda senkronizasyon: parent fetch ediyorsa güncellenecek
      onReload?.();
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
      setItemsLocal(prev => prev.filter(it => it.id !== id));
      await onReload?.();
    } catch (e: any) {
      notifyFn(e?.message || 'Hata oluştu');
    }
  }, [notifyFn, onReload]);

  // Derive tag list from itemsLocal
  const itemsTags = useMemo(() => {
    const s = new Set<string>();
    for (const it of itemsLocal) (it.tags || []).forEach(t => s.add(t));
    return Array.from(s).sort();
  }, [itemsLocal]);

  // Filtered items by selected tags (AND)
  const filteredItems = useMemo(() => {
    if (itemsSelected.size === 0) return itemsLocal;
    return itemsLocal.filter(it => {
      const tags = new Set(it.tags || []);
      for (const t of itemsSelected) if (!tags.has(t)) return false;
      return true;
    });
  }, [itemsLocal, itemsSelected]);

  // Pagination derived values and effects
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PER_PAGE));
  const pageStart = Math.min((page - 1) * PER_PAGE, Math.max(0, (totalPages - 1) * PER_PAGE));
  const pageItems = filteredItems.slice(pageStart, pageStart + PER_PAGE);

  useEffect(() => { setPage(1); }, [itemsLocal.length, itemsSelected.size]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  // Items with "add" card and row-major two-column split for desktop
  const itemsWithAdd = useMemo(() => (canShowAdd ? [{ __add: true } as any, ...pageItems] : pageItems), [pageItems, canShowAdd]);
  const [colLeft, colRight] = useMemo(() => {
    const L: any[] = []; const R: any[] = [];
    itemsWithAdd.forEach((it, idx) => ((idx % 2 === 0) ? L : R).push(it));
    return [L, R];
  }, [itemsWithAdd]);


  return (
    <section
      className="fade-slide-in rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
    >
      <div className="px-4 pb-4 pt-3 space-y-3">
        {loading ? (
          <Skeleton rows={4} />
        ) : itemsLocal.length === 0 ? (
          isPublicBrandPage ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Ürün yok</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {canShowAdd ? (
                qaOpen ? (
                  <div className="md:col-span-2">
                    <QuickAddCard
                      open
                      onClose={() => setQaOpen(false)}
                      onSubmit={handleQuickAddSubmit}
                      trending={trending}
                      allTags={itemsTags}
                      variant="rich"
                      signedIn={!!myId}
                      signInHref="/signin"
                      prefill={{ tags: Array.from(itemsSelected).slice(0, 3) }}
                      isBrandProfile
                    />
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setQaOpen(true)}
                      className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 p-4 shadow-sm grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition"
                      aria-label="Hızlı ekle"
                      title="Hızlı ekle"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-5xl leading-none">+</span>
                        <span className="text-base font-medium">Ekle</span>
                      </div>
                    </button>
                  </div>
                )
              ) : (
                !effectiveHideAdd ? (
                  qaOpen ? (
                    <QuickAddCard
                      open
                      onClose={() => setQaOpen(false)}
                      onSubmit={handleQuickAddSubmit}
                      trending={trending}
                      allTags={itemsTags}
                      variant="rich"
                      signedIn={!!myId}
                      signInHref="/signin"
                      prefill={{ tags: Array.from(itemsSelected).slice(0, 3) }}
                      isBrandProfile={!!isBrandProfile}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setQaOpen(true)}
                      className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 p-4 shadow-sm grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition"
                      aria-label="Hızlı ekle"
                      title="Hızlı ekle"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-5xl leading-none">+</span>
                        <span className="text-base font-medium">Ekle</span>
                      </div>
                    </button>
                  )
                ) : null
              )}
            </div>
          )
        ) : (
          <>
            {/* Tag filter — QuickAddCard tarzı: 4'lük sayfa, oklar, + ikonlu chip, dots */}
            {itemsTags.length > 0 && (
              <div className="mb-3">
                <TagFilterBar
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
                />
              </div>
            )}

            {/* Liste: Mobil/Tablet tek sütun (sıra korunur), lg+ iki sütun (masonry benzeri) */}

            {/* MOBILE+TABLET: tek sütun — gerçek sıra */}
            <div className="flex flex-col gap-5 lg:hidden">
              {itemsWithAdd.map((it: any, ix: number) => (
                it?.__add ? (
                  !effectiveHideAdd ? (
                    qaOpen ? (
                      <QuickAddCard
                        key={`add-m-${ix}`}
                        open
                        onClose={() => setQaOpen(false)}
                        onSubmit={handleQuickAddSubmit}
                        trending={trending}
                        allTags={itemsTags}
                        variant="rich"
                        signedIn={!!myId}
                        signInHref="/signin"
                        prefill={{ tags: Array.from(itemsSelected).slice(0, 3) }}
                        isBrandProfile={!!isBrandProfile}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setQaOpen(true)}
                        className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 p-4 shadow-sm grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition"
                        aria-label="Hızlı ekle"
                        title="Hızlı ekle"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl leading-none">+</span>
                          <span className="text-sm font-medium">Ekle</span>
                        </div>
                      </button>
                    )
                  ) : null
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
              {qaOpen && (
                <div className="lg:col-span-2">
                  <QuickAddCard
                    open
                    onClose={() => setQaOpen(false)}
                    onSubmit={handleQuickAddSubmit}
                    trending={trending}
                    allTags={itemsTags}
                    variant="rich"
                    signedIn={!!myId}
                    signInHref="/signin"
                    prefill={{ tags: Array.from(itemsSelected).slice(0, 3) }}
                    isBrandProfile={!!isBrandProfile}
                  />
                </div>
              )}
              {/* Sol sütun */}
              <div className="flex flex-col gap-5">
                {colLeft.map((it: any, ix: number) => (
                  it?.__add ? (
                    !effectiveHideAdd ? (
                      qaOpen ? null : (
                        <button
                          type="button"
                          onClick={() => setQaOpen(true)}
                          className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 p-4 shadow-sm grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition"
                          aria-label="Hızlı ekle"
                          title="Hızlı ekle"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl leading-none">+</span>
                            <span className="text-sm font-medium">Ekle</span>
                          </div>
                        </button>
                      )
                    ) : null
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
                    !effectiveHideAdd ? (
                      qaOpen ? null : (
                        <button
                          type="button"
                          onClick={() => setQaOpen(true)}
                          className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 p-4 shadow-sm grid place-items-center min-h-[152px] hover:-translate-y-0.5 hover:shadow-md transition"
                          aria-label="Hızlı ekle"
                          title="Hızlı ekle"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl leading-none">+</span>
                            <span className="text-sm font-medium">Ekle</span>
                          </div>
                        </button>
                      )
                    ) : null
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
        <div className="mt-2">
          <Pager page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
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
