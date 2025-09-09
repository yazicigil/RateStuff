'use client';

import React from 'react';
import TagFilterBar from '@/components/common/TagFilterBar';
import ItemCard from '@/components/home/ItemCard';

export type ProductsListItem = {
  id: string;
  name: string;
  tags?: string[];
  desc?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  // Ek alanlar varsa genişletin
  [key: string]: any;
};

export type ProductsListProps<T extends ProductsListItem = ProductsListItem> = {
  /** Ham ürün listesi */
  items: T[];
  /** Trend etiketler */
  trending?: string[];
  /** Tüm etiketler (filtre bar için) */
  allTags?: string[];
  /** Başlangıç seçili etiketler */
  initialSelectedTags?: string[];
  /** Marka teması: CSS değişkenleri (var(--brand-*)) tanımlıysa otomatik uyar */
  brandTheme?: boolean;
  /** Ürün kartını nasıl çizeceğimizi belirten render prop (yoksa ItemCard kullanılır) */
  renderItem?: (item: T) => React.ReactNode;
  /** Liste boş ise gösterilecek JSX */
  emptyState?: React.ReactNode;
  /** Arama kutusunun placeholder metni */
  searchPlaceholder?: string;
  /** Dışarıya değişiklikleri bildirmek isterseniz */
  onFilterChange?: (state: { q: string; selected: Set<string> }) => void;
  className?: string;

  /** ItemCard entegrasyonu için opsiyoneller (ItemsTab ile eşleşecek şekilde) */
  me?: any;
  amAdmin?: boolean;
  myId?: string | null;
  savedIds?: Set<string> | string[];
  copiedShareId?: string | null;

  onDeleted?: (id: string) => void;            // legacy name
  onDelete?: (id: string) => void;             // preferred forward
  onSavedChanged?: (id: string, saved: boolean) => void;
  onItemChanged?: (id: string) => void;

  onOpenSpotlight?: (id: string) => void;
  onToggleSave?: (id: string) => void;
  onReport?: (id: string) => void;
  onCopyShare?: (id: string) => void;
  onNativeShare?: (id: string, name?: string) => void;
  onShowInList?: (id: string) => void;
  onVoteComment?: (commentId: string, v?: number) => void;

  showComments?: boolean;
  showCommentBox?: boolean;

  /** Tag etkileşimleri */
  selectedTagsExternal?: Set<string>;  // dışarıdan kontrol etmek istersen
  onToggleTag?: (t: string) => void;
  onResetTags?: () => void;

  /** Ekstra ItemCard prop'larını doğrudan geçmek istersen */
  itemCardProps?: any;
};

export default function ProductsList<
  T extends ProductsListItem = ProductsListItem
>({
  items,
  trending = [],
  allTags,
  initialSelectedTags = [],
  brandTheme = false,
  renderItem,
  emptyState,
  searchPlaceholder = 'Ürün ara…',
  onFilterChange,
  className = '',
  me,
  amAdmin,
  myId,
  savedIds,
  copiedShareId,
  onDeleted,
  onDelete,
  onSavedChanged,
  onItemChanged,
  onOpenSpotlight,
  onToggleSave,
  onReport,
  onCopyShare,
  onNativeShare,
  onShowInList,
  onVoteComment,
  showComments = false,
  showCommentBox = false,
  selectedTagsExternal,
  onToggleTag,
  onResetTags,
  itemCardProps,
}: ProductsListProps<T>) {
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const [surfaceTone, setSurfaceTone] = React.useState<'light' | 'dark' | null>(null);

  const parseRgb = (s: string) => {
    // expected formats: rgb(a) or hex fallback
    if (!s) return null;
    if (s.startsWith('rgb')) {
      const nums = s.match(/rgba?\(([^)]+)\)/i)?.[1]?.split(',').map((v) => parseFloat(v.trim()));
      if (!nums || nums.length < 3) return null;
      const [r, g, b, a = 1] = nums as any;
      return { r, g, b, a };
    }
    if (s.startsWith('#')) {
      const hex = s.replace('#','');
      const cv = (h: string) => parseInt(h, 16);
      if (hex.length === 3) {
        const r = cv(hex[0]+hex[0]);
        const g = cv(hex[1]+hex[1]);
        const b = cv(hex[2]+hex[2]);
        return { r, g, b, a: 1 };
      }
      if (hex.length >= 6) {
        const r = cv(hex.slice(0,2));
        const g = cv(hex.slice(2,4));
        const b = cv(hex.slice(4,6));
        return { r, g, b, a: 1 };
      }
    }
    return null;
  };
  const relLum = (rgb: {r:number;g:number;b:number}) => {
    const srgb = [rgb.r, rgb.g, rgb.b].map(v => v/255).map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
  };

  React.useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    let bg = cs.backgroundColor || cs.background || '';
    // Some themes set transparent; walk up to find a non-transparent bg
    let node: HTMLElement | null = el;
    while (node && (!bg || bg.includes('transparent') || bg === 'rgba(0, 0, 0, 0)')) {
      node = node.parentElement;
      if (!node) break;
      const c2 = getComputedStyle(node);
      bg = c2.backgroundColor || c2.background || bg;
    }
    const rgb = parseRgb(bg);
    if (!rgb) { setSurfaceTone(null); return; }
    const L = relLum(rgb);
    setSurfaceTone(L < 0.42 ? 'dark' : 'light');
  }, [brandTheme, items.length]);

  // State
  const [q, setQ] = React.useState('');
  const [internalSelected, setInternalSelected] = React.useState<Set<string>>(new Set(initialSelectedTags));
  const [order, setOrder] = React.useState<'new' | 'top'>('new');
  const selected = selectedTagsExternal ?? internalSelected;
  const setSelected = (updater: (prev: Set<string>) => Set<string>) => {
    if (selectedTagsExternal) {
      // dışarıdan yönetiliyorsa sadece callback tetikle
      const next = updater(new Set(selectedTagsExternal));
      onToggleTag?.([...next][next.size - 1] ?? ''); // son değişen tag'ı üstte zaten handle ediyorsun
      return;
    }
    setInternalSelected((prev) => updater(prev));
  };

  // Tüm etiketler: verilmişse onu kullan; yoksa item'lardan topla
  const tags = React.useMemo(() => {
    if (allTags && allTags.length) return allTags;
    const s = new Set<string>();
    for (const it of items) (it.tags || []).forEach((t) => s.add(t));
    return Array.from(s);
  }, [allTags, items]);

  // Filtreli liste
  const filtered = React.useMemo(() => {
    const hasSel = selected.size > 0;
    const qn = q.trim().toLowerCase();
    const base = items.filter((it) => {
      const matchTags = !hasSel || (it.tags || []).some((t) => selected.has(t));
      const matchQ = !qn || it.name.toLowerCase().includes(qn) || (it.desc || '').toLowerCase().includes(qn);
      return matchTags && matchQ;
    });
    // Sort
    if (order === 'top') {
      const score = (it: any) => {
        const s = it.rating ?? it.avgRating ?? it.avg ?? 0;
        return typeof s === 'number' ? s : parseFloat(s) || 0;
      };
      return [...base].sort((a, b) => score(b) - score(a));
    }
    // 'new' -> keep incoming order (assumed newest first)
    return base;
  }, [items, selected, q, order]);

  React.useEffect(() => {
    onFilterChange?.({ q, selected });
  }, [q, selected, onFilterChange]);

  // ItemCard kontrol durumları
  const [openShareId, setOpenShareId] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(copiedShareId ?? null);
  React.useEffect(() => setCopiedId(copiedShareId ?? null), [copiedShareId]);

  const savedSet = React.useMemo(() => {
    if (!savedIds) return new Set<string>();
    return savedIds instanceof Set ? savedIds : new Set(savedIds);
  }, [savedIds]);

  // Stil: marka teması varsa CSS değişkenlerini kullan
  const tone = brandTheme
    ? ({
        // Yazı rengi marka temasıyla daima kontrastlı olsun
        color: 'var(--brand-ink, var(--brand-ink-strong, inherit))',
      } as React.CSSProperties)
    : undefined;

  const inkByTone = surfaceTone === 'dark'
    ? '#fff'
    : 'var(--brand-ink, var(--brand-ink-strong, #111))';
  const bdByTone = surfaceTone === 'dark'
    ? 'rgba(255,255,255,.28)'
    : 'var(--brand-elev-bd, rgba(0,0,0,.14))';

  return (
    <section className={`w-full ${className}`} style={tone} data-surface={surfaceTone ?? undefined}>
      <div
        ref={surfaceRef}
        className="rounded-3xl border shadow-sm p-3 sm:p-4 md:p-5"
        style={brandTheme ? {
          background: 'var(--brand-items-bg, var(--brand-elev-weak, transparent))',
          borderColor: bdByTone,
          color: inkByTone,
        } : undefined}
      >
        {/* Tag Filter */}
      {tags.length > 0 && (
        <div className="mb-3">
          <TagFilterBar
            tags={tags}
            trending={trending}
            selected={selected}
            onToggle={(t) => {
              if (onToggleTag) onToggleTag(t);
              else setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(t)) next.delete(t); else next.add(t);
                return next;
              });
            }}
            onClear={() => {
              if (onResetTags) onResetTags();
              else setSelected(() => new Set());
            }}
            brandTheme={brandTheme}
          />
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div
          className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 shadow-sm backdrop-blur-sm
          ${brandTheme ? '' : 'bg-white/70 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'}
        `}
          style={brandTheme ? {
            background: 'var(--brand-elev-weak, transparent)',
            borderColor: bdByTone,
            color: inkByTone,
          } : undefined}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-sm py-1 placeholder:opacity-60 placeholder:placeholder-current"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="rounded-lg p-1 border hover:bg-black/5 dark:hover:bg-white/10 hover:opacity-90"
                aria-label="Temizle"
                style={brandTheme ? { borderColor: bdByTone, color: inkByTone } : undefined}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          {/* Sort control */}
          <div className="hidden sm:flex items-center gap-1 ml-2 shrink-0">
            <button
              type="button"
              onClick={() => setOrder('new')}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${order==='new' ? '' : ''}`}
              style={brandTheme ? (order==='new'
                ? { background: 'var(--brand-accent-strong, var(--brand-accent))', borderColor: inkByTone, boxShadow: `0 0 0 1px ${inkByTone} inset`, color: '#fff' }
                : { background: 'var(--brand-elev-weak, transparent)', borderColor: bdByTone, color: inkByTone }
              ) : undefined}
            >
              En yeni
            </button>
            <button
              type="button"
              onClick={() => setOrder('top')}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${order==='top' ? '' : ''}`}
              style={brandTheme ? (order==='top'
                ? { background: 'var(--brand-accent-strong, var(--brand-accent))', borderColor: inkByTone, boxShadow: `0 0 0 1px ${inkByTone} inset`, color: '#fff' }
                : { background: 'var(--brand-elev-weak, transparent)', borderColor: bdByTone, color: inkByTone }
              ) : undefined}
            >
              En yüksek puan
            </button>
          </div>
          {/* Mobile: use a compact select */}
          <div className="sm:hidden ml-2 shrink-0">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as 'new' | 'top')}
              className="text-xs rounded-lg border px-2 py-1 bg-transparent"
              style={brandTheme ? { borderColor: bdByTone, color: inkByTone, background: 'var(--brand-elev-weak, transparent)' } : undefined}
              aria-label="Sırala"
            >
              <option value="new">En yeni</option>
              <option value="top">En yüksek puan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="grid place-items-center h-32 text-sm opacity-70">
          {emptyState ?? <span>Henüz ürün eklenmemiş.</span>}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-visible"
        >
          {filtered.map((it) => {
            const isElevated = openShareId === it.id || openMenuId === it.id;
            return (
            <div
              key={it.id}
              className={`w-full rounded-2xl ${isElevated ? 'relative z-50' : ''} h-full flex flex-col`}
              style={brandTheme ? {
                background: 'var(--brand-elev-strong, var(--brand-elev, rgba(0,0,0,.04)))',
                border: `1px solid ${bdByTone}`,
                color: inkByTone,
              } : undefined}
            >
              {renderItem ? (
                renderItem(it)
              ) : (
                <ItemCard
                  className="h-full"
                  item={it as any}
                  me={me}
                  saved={savedSet.has(it.id)}
                  amAdmin={!!amAdmin}
                  myId={myId ?? null}
                  showComments={!!showComments}
                  showCommentBox={!!showCommentBox}

                  openShareId={openShareId}
                  setOpenShareId={setOpenShareId}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  copiedShareId={copiedId}

                  onOpenSpotlight={onOpenSpotlight}
                  onToggleSave={onToggleSave ?? (() => {})}
                  onReport={onReport ?? (() => {})}
                  onDelete={onDelete ?? onDeleted}
                  onCopyShare={onCopyShare ?? ((id: string) => setCopiedId(id))}
                  onNativeShare={onNativeShare ?? (() => {})}
                  onShowInList={onShowInList ?? (() => {})}
                  onVoteComment={onVoteComment ?? (() => {})}
                  onItemChanged={onItemChanged}

                  selectedTags={selected}
                  onToggleTag={onToggleTag ?? (() => {})}
                  onResetTags={onResetTags ?? (() => {})}

                  {...(itemCardProps as any)}
                />
              )}
            </div>
            )
          })}
        </div>
      )}
      </div>
    </section>
  );
}
