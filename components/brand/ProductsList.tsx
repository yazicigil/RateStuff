'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const QuickAddCard = dynamic(() => import('@/components/home/QuickAddCard'), { ssr: false });
import { useRouter } from 'next/navigation';
import TagFilterBar from '@/components/common/TagFilterBar';
import ItemCard from '@/components/items/ItemCard';
import Pager from '@/components/common/Pager';
import ReportModal from '@/components/common/ReportModal';

export type ProductsListItem = {
  id: string;
  name: string;
  tags?: string[];
  desc?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  suspendedAt?: string | null; // backend source of truth
  createdBy?: { id: string } | null; // owner info
  createdById?: string; // legacy fallback
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

  /** (Public brand sayfası için) listenin sahibi kullanıcı id'si */
  ownerId?: string;
  /** QuickAdd kapandığında veya item oluşturulduğunda tetiklenecek callback */
  onQuickAddDone?: (newItemId?: string) => void;
  onReload?: () => void | Promise<void>;
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
  ownerId,
  onQuickAddDone,
  onReload,
}: ProductsListProps<T>) {
  const router = useRouter();
  const handleOpenSpotlight = React.useCallback((id: string) => {
    if (onOpenSpotlight) return onOpenSpotlight(id);
    // Spotlight ana sayfada: https://ratestuff.net/?item=<id>
    router.push(`/?item=${id}`);
  }, [onOpenSpotlight, router]);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const [surfaceTone, setSurfaceTone] = React.useState<'light' | 'dark' | null>(null);
  const [accentTone, setAccentTone] = React.useState<'light' | 'dark' | null>(null);
  React.useEffect(() => {
    const host = surfaceRef.current;
    if (!host) return;
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.background = 'var(--brand-accent-strong, var(--brand-accent))';
    host.appendChild(probe);
    const bg = getComputedStyle(probe).backgroundColor || '';
    host.removeChild(probe);
    const rgb = parseRgb(bg);
    if (!rgb) { setAccentTone(null); return; }
    const L = relLum(rgb);
    setAccentTone(L < 0.5 ? 'dark' : 'light');
  }, [brandTheme]);

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

  // ---- Suspended & owner helpers (schema-agnostic) ----

  const getOwnerId = React.useCallback((it: any): string | null => {
    // Backend shapeItem returns createdBy.id; keep createdById as fallback for older payloads
    return it?.createdBy?.id ?? it?.createdById ?? null;
  }, []);

  // Backend contract: item is suspended IFF `suspendedAt` is non-null (ISO string/date)
  const isItemSuspended = React.useCallback((it: any): boolean => {
    return Boolean(it?.suspendedAt);
  }, []);

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
  const PER_PAGE = 8;
  const [page, setPage] = React.useState(1);
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

  // ItemsTab modeli: lokal kopya + removedIds ile optimistik güncelleme
  const [itemsLocal, setItemsLocal] = React.useState(items);
  React.useEffect(() => { setItemsLocal(items); }, [items]);
  const [removedIds, setRemovedIds] = React.useState<Set<string>>(new Set());

  // Tüm etiketler: verilmişse onu kullan; yoksa item'lardan topla
 const tags = React.useMemo(() => {
  if (allTags && allTags.length) return allTags;
  const s = new Set<string>();
  for (const it of itemsLocal) {
    if (removedIds.has(it.id)) continue;
    (it.tags || []).forEach((t) => s.add(t));
  }
  return Array.from(s);
}, [itemsLocal, removedIds, selected, q, order, myId]);

  // Filtreli liste
const filtered = React.useMemo(() => {
  const hasSel = selected.size > 0;
  const qn = q.trim().toLowerCase();
  const base = itemsLocal.filter((it) => {
    if (removedIds.has(it.id)) return false;

    // Suspended items: hide from everyone except owner (or admin)
    const ownerOfItem = getOwnerId(it as any);
    if (isItemSuspended(it) && ownerOfItem !== myId && !amAdmin) return false;

    const matchTags = !hasSel || (it.tags || []).some((t) => selected.has(t));
    const matchQ = !qn || it.name.toLowerCase().includes(qn) || (it.desc || '').toLowerCase().includes(qn);
    return matchTags && matchQ;
  });
  if (order === 'top') {
    const score = (it: any) => {
      const s = it.rating ?? it.avgRating ?? it.avg ?? 0;
      return typeof s === 'number' ? s : parseFloat(s) || 0;
    };
    return [...base].sort((a, b) => score(b) - score(a));
  }
  return base;
}, [itemsLocal, removedIds, selected, q, order, myId, amAdmin]);

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageStart = Math.min((page - 1) * PER_PAGE, Math.max(0, (totalPages - 1) * PER_PAGE));
  const pageItems = filtered.slice(pageStart, pageStart + PER_PAGE);

  React.useEffect(() => { setPage(1); }, [q, order, selected.size, items.length]);
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  React.useEffect(() => {
    onFilterChange?.({ q, selected });
  }, [q, selected, onFilterChange]);

  // ItemCard kontrol durumları
  const [openShareId, setOpenShareId] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(copiedShareId ?? null);
React.useEffect(() => setCopiedId(copiedShareId ?? null), [copiedShareId]);

// Saved optimistic shadow map
const [savedShadow, setSavedShadow] = React.useState<Map<string, boolean>>(new Map());

// Report modal state (homepage-like)
const REPORT_PRESETS = [
  'Spam',
  'Nefret söylemi',
  'Şiddet / Tehdit',
  'Uygunsuz içerik',
  'Kişisel veri',
  'Taciz',
  'Spoiler',
  'Yanlış bilgi',
  'Telif ihlali',
  'Diğer',
] as const;

const [reportOpen, setReportOpen] = React.useState(false);
const [reportTargetId, setReportTargetId] = React.useState<string | null>(null);
const [reportPreset, setReportPreset] = React.useState<(typeof REPORT_PRESETS)[number] | ''>('');
const [reportDetails, setReportDetails] = React.useState('');
const [reportSubmitting, setReportSubmitting] = React.useState(false);
const [reportError, setReportError] = React.useState<string | null>(null);
const [reportSuccess, setReportSuccess] = React.useState(false);

// Share helpers
const buildShareUrl = React.useCallback((id: string) => `https://ratestuff.net/share/${id}`, []);
const canNativeShare = typeof window !== 'undefined' && !!(navigator as any)?.share;

const savedSet = React.useMemo(() => {
    if (!savedIds) return new Set<string>();
    return savedIds instanceof Set ? savedIds : new Set(savedIds);
  }, [savedIds]);

  // Sadece gerçek profil sahibinde QuickAdd/Ekle kartını göster. Public sayfalarda yanlışlıkla tetiklenmesin diye items içeriğine bakarak tahmin etmiyoruz.
  const isOwner = React.useMemo(() => {
    if (!myId) return false;
    if (ownerId == null) return false; // ownerId bilinmiyorsa public varsay
    return myId === ownerId;
  }, [myId, ownerId]);

  // QuickAdd visibility
  const [showQuickAdd, setShowQuickAdd] = React.useState(false);

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
  const selInkByAccent = accentTone === 'dark' ? '#fff' : 'var(--brand-ink, var(--brand-ink-strong, #111))';

  // Add Card style helpers
  const addCardBorder = bdByTone;
  const addCardInk = inkByTone;
  const addCardBg = brandTheme ? 'var(--brand-elev-weak, rgba(0,0,0,.03))' : 'transparent';

  // Default delete handler (if parent doesn't provide one)
const handleDelete = React.useCallback(async (id: string) => {
  try {
    // optimistik gizle
    setRemovedIds(prev => { const next = new Set(prev); next.add(id); return next; });
    // ItemsTab ile aynı endpoint
    const res = await fetch(`/api/items/${id}/delete`, { method: 'POST' });
    if (!res.ok) {
      // revert
      setRemovedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      console.warn('Delete failed', await res.text().catch(() => ''));
      return;
    }
    // kalıcı çıkar
    setItemsLocal(prev => prev.filter(it => (it as any).id !== id));
    onDeleted?.(id);
    onItemChanged?.(id);
    try { await onReload?.(); } catch {}
  } catch (e) {
    // revert on unexpected error
    setRemovedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    console.warn('Delete error', e);
  }
}, [onDeleted, onItemChanged, onReload]);
// Toggle Save via /api/items/:id/save (POST save, DELETE unsave)
const handleToggleSave = React.useCallback(async (id: string) => {
  try {
    const currentlySaved = savedShadow.has(id) ? savedShadow.get(id)! : savedSet.has(id);
    const nextSaved = !currentlySaved;
    // optimistic update
    setSavedShadow(prev => new Map(prev).set(id, nextSaved));
    const method = nextSaved ? 'POST' : 'DELETE';
    const res = await fetch(`/api/items/${id}/save`, { method });
    if (!res.ok) {
      // revert
      setSavedShadow(prev => new Map(prev).set(id, currentlySaved));
      console.warn('Save toggle failed', await res.text().catch(() => ''));
      return;
    }
    onSavedChanged?.(id, nextSaved);
    onItemChanged?.(id);
    try { await onReload?.(); } catch {}
  } catch (e) {
    console.warn('Save toggle error', e);
  }
}, [savedSet, savedShadow, onSavedChanged, onItemChanged, onReload]);

// Report → modal aç (homepage-like)
const handleReport = React.useCallback((id: string) => {
  setReportTargetId(id);
  setReportPreset('');
  setReportDetails('');
  setReportError(null);
  setReportOpen(true);
}, []);

async function submitReport() {
  if (!reportTargetId) return;
  const preset = String(reportPreset || '').trim();
  const details = String(reportDetails || '').trim();
  if (!preset) { setReportError('Lütfen bir sebep seç.'); return; }
  if (preset === 'Diğer' && !details) { setReportError('Diğer seçildi, lütfen sebebi yaz.'); return; }

  const reason = preset === 'Diğer' ? details : (details ? `${preset} — ${details}` : preset);

  setReportSubmitting(true);
  setReportError(null);
  const res = await fetch(`/api/items/${reportTargetId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  setReportSubmitting(false);

  let j: any = null; try { j = await res.json(); } catch {}
  if (res.ok && j?.ok) {
    setReportOpen(false);
    const id = reportTargetId;
    setReportTargetId(null);
    setReportPreset('');
    setReportDetails('');
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 1600);
    try { await onReload?.(); } catch {}
    if (id) onItemChanged?.(id);
  } else {
    setReportError(j?.error || `${res.status} ${res.statusText}`);
  }
}

// Kopyala (fallback)
const handleCopyShare = React.useCallback(async (id: string) => {
  try {
    const url = buildShareUrl(id);
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
  } catch (e) {
    console.warn('Copy share failed', e);
  }
}, [buildShareUrl]);

// Native share (destek yoksa kopyala)
const handleNativeShare = React.useCallback(async (id: string, name?: string) => {
  const url = buildShareUrl(id);
  if (canNativeShare) {
    try {
      await (navigator as any).share({ title: name || 'RateStuff', text: name || 'RateStuff paylaşımı', url });
      setCopiedId(id);
      return;
    } catch {
      // cancel/fail → fallback
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
  } catch (e) {
    console.warn('Share fallback copy failed', e);
  }
}, [buildShareUrl, canNativeShare]);



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
                ? { background: 'var(--brand-accent-strong, var(--brand-accent))', borderColor: selInkByAccent, boxShadow: `0 0 0 1px ${selInkByAccent} inset`, color: selInkByAccent }
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
                ? { background: 'var(--brand-accent-strong, var(--brand-accent))', borderColor: selInkByAccent, boxShadow: `0 0 0 1px ${selInkByAccent} inset`, color: selInkByAccent }
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
        isOwner ? (
          showQuickAdd ? (
            <div
              className="brand-quickadd-scope col-span-1 sm:col-span-2 lg:col-span-3"
              style={{ color: 'var(--brand-ink)' }}
            >
              <QuickAddCard
                open={showQuickAdd}
                onClose={() => setShowQuickAdd(false)}
                trending={tags}
                allTagsEndpoint="/api/tags?limit=500"
                variant="rich"
                signedIn={Boolean(myId)}
                isBrandProfile
                autoCloseOnSuccess
                onSubmit={async (payload) => {
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
                        ownerId: ownerId ?? undefined,
                        source: 'brand-profile-quickadd',
                      }),
                    });
                    if (!res.ok) return false;
                    const data = await res.json().catch(() => ({}));
                    const newId = data?.id as (string | undefined);
                    if (data && (data as any).id) {
                      setItemsLocal((prev: any[]) => [{ ...(data as any) }, ...prev]);
                    }
                    setShowQuickAdd(false);
                    try { await onReload?.(); } catch {}
                    onQuickAddDone?.(newId);
                    return true;
                  } catch {
                    return false;
                  }
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                className="w-full rounded-2xl h-full flex flex-col min-h-[260px] sm:min-h-[300px] lg:min-h-[340px]"
                style={brandTheme ? {
                  background: 'var(--brand-elev-strong, var(--brand-elev, rgba(0,0,0,.04)))',
                  color: inkByTone,
                  outline: 'none',
                  boxShadow: 'none',
                } : undefined}
              >
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="flex-1 rounded-2xl border flex items-center justify-center text-sm"
                  style={{ borderColor: addCardBorder, color: addCardInk, background: addCardBg }}
                  aria-label="Yeni ürün ekle"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl leading-none">+</span>
                    <span className="opacity-80">Ekle</span>
                  </div>
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="grid place-items-center h-32 text-sm opacity-70">
            {emptyState ?? <span>Henüz ürün eklenmemiş.</span>}
          </div>
        )
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-visible"
        >
          {isOwner && !showQuickAdd && (
            <div
              className="w-full rounded-2xl h-full flex flex-col"
              style={brandTheme ? {
                background: 'var(--brand-elev-strong, var(--brand-elev, rgba(0,0,0,.04)))',
                color: inkByTone,
                outline: 'none',
                boxShadow: 'none',
              } : undefined}
            >
              <button
                type="button"
                onClick={() => setShowQuickAdd(true)}
                className="flex-1 rounded-2xl border flex items-center justify-center text-sm"
                style={{ borderColor: addCardBorder, color: addCardInk, background: addCardBg }}
                aria-label="Yeni ürün ekle"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl leading-none">+</span>
                  <span className="opacity-80">Ekle</span>
                </div>
              </button>
            </div>
          )}
          {showQuickAdd && isOwner && (
            <div
              className="brand-quickadd-scope col-span-1 sm:col-span-2 lg:col-span-3"
              style={{ color: 'var(--brand-ink)' }}
            >
              <QuickAddCard
                open={showQuickAdd}
                onClose={() => setShowQuickAdd(false)}
                trending={tags}
                allTagsEndpoint="/api/tags?limit=500"
                variant="rich"
                signedIn={Boolean(myId)}
                isBrandProfile
                autoCloseOnSuccess
                onSubmit={async (payload) => {
                  try {
                    // Client-side create API (adjust endpoint to your API if different)
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
                        ownerId: ownerId ?? undefined,
                        source: 'brand-profile-quickadd',
                      }),
                    });
                    if (!res.ok) return false;
                    const data = await res.json().catch(() => ({}));
                    const newId = data?.id as (string | undefined);
                    if (data && (data as any).id) {
                      setItemsLocal((prev: any[]) => [{ ...(data as any) }, ...prev]);
                    }
                    setShowQuickAdd(false);
                    try { await onReload?.(); } catch {}
                    onQuickAddDone?.(newId);
                    return true;
                  } catch {
                    return false;
                  }
                }}
              />
            </div>
          )}
          {pageItems.map((it) => {
            const isElevated = openShareId === it.id || openMenuId === it.id;
            return (
              <div
                key={it.id}
                data-suspended={isItemSuspended(it) ? 'true' : 'false'}
                data-owner={(getOwnerId(it) === myId) ? 'true' : 'false'}
                className={`w-full rounded-2xl ${isElevated ? 'relative z-50' : ''} h-full flex flex-col`}
                style={brandTheme ? {
                  background: 'var(--brand-elev-strong, var(--brand-elev, rgba(0,0,0,.04)))',
                  color: inkByTone,
                  outline: 'none',
                  boxShadow: 'none',
                } : undefined}
              >
                {renderItem ? (
                  renderItem(it)
                ) : (
                  <ItemCard
                    className="h-full"
                    item={{ ...(it as any), suspended: isItemSuspended(it) }}
                    me={me}
                    saved={savedShadow.has(it.id) ? savedShadow.get(it.id)! : savedSet.has(it.id)}
                    amAdmin={!!amAdmin}
                    myId={myId ?? null}
                    showComments={!!showComments}
                    showCommentBox={!!showCommentBox}

                    openShareId={openShareId}
                    setOpenShareId={setOpenShareId}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    copiedShareId={copiedId}

                    onOpenSpotlight={handleOpenSpotlight}
                    onToggleSave={onToggleSave ?? handleToggleSave}
                    onReport={onReport ?? handleReport}
                    onDelete={onDelete ?? handleDelete}
                    onCopyShare={onCopyShare ?? handleCopyShare}
                    onNativeShare={onNativeShare ?? handleNativeShare}
                    onShowInList={onShowInList}
                    onVoteComment={onVoteComment}
                    onItemChanged={onItemChanged ?? (async () => { try { await onReload?.(); } catch {} })}

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
      <div className="mt-4">
        <Pager page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* QuickAdd brand theming */}
      <style jsx global>{`
        /* Scope all QuickAdd content to brand ink & accents */
        .brand-quickadd-scope {
          color: var(--brand-ink);
        }
        .brand-quickadd-scope a,
        .brand-quickadd-scope label,
        .brand-quickadd-scope input,
        .brand-quickadd-scope textarea,
        .brand-quickadd-scope select,
        .brand-quickadd-scope button,
        .brand-quickadd-scope [role="button"],
        .brand-quickadd-scope .rs-chip,
        .brand-quickadd-scope [data-chip] {
          color: inherit;
        }
        /* Make all inputs follow scoped ink color (override Tailwind dark:text-*) */
        .brand-quickadd-scope input,
        .brand-quickadd-scope textarea,
        .brand-quickadd-scope select {
          color: inherit !important;
          caret-color: currentColor;
        }
        .brand-quickadd-scope input::placeholder,
        .brand-quickadd-scope textarea::placeholder,
        .brand-quickadd-scope select::placeholder {
          color: color-mix(in oklab, currentColor 55%, transparent);
        }
        /* Icons follow currentColor */
        .brand-quickadd-scope svg [fill]:not([fill="none"]) { fill: currentColor; }
        .brand-quickadd-scope svg [stroke]:not([stroke="none"]) { stroke: currentColor; }

        /* Primary CTA uses brand accent */
        .brand-quickadd-scope .rs-btn--primary,
        .brand-quickadd-scope button[data-variant="primary"] {
          background: var(--brand-accent);
          border-color: var(--brand-accent-strong, var(--brand-accent));
          color: var(--brand-accent-ink, #fff);
        }
        .brand-quickadd-scope .rs-btn--primary:hover,
        .brand-quickadd-scope button[data-variant="primary"]:hover {
          filter: brightness(0.96);
        }

        /* Outline / Ghost buttons respect brand ink and borders */
        .brand-quickadd-scope .rs-btn--outline,
        .brand-quickadd-scope .rs-btn--ghost,
        .brand-quickadd-scope button[data-variant="outline"],
        .brand-quickadd-scope button[data-variant="ghost"] {
          background: transparent;
          color: var(--brand-ink);
          border-color: var(--brand-elev-bd, rgba(0,0,0,.14));
        }
        .brand-quickadd-scope .rs-btn--outline[aria-pressed="true"],
        .brand-quickadd-scope .rs-btn--ghost[aria-pressed="true"] {
          box-shadow: 0 0 0 1px var(--brand-elev-bd, rgba(0,0,0,.14)) inset;
        }
.brand-quickadd-scope .rs-tag-input {
  background: transparent !important;
}
        /* Tag/chip suggestions */
       .brand-quickadd-scope .rs-chip,
.brand-quickadd-scope [data-chip] {
  background: transparent;
  border-color: var(--brand-elev-bd, rgba(0,0,0,.18));
  color: var(--brand-ink-strong, var(--brand-ink));
}
.brand-quickadd-scope .rs-chip:hover,
.brand-quickadd-scope [data-chip]:hover {
  background: color-mix(in oklab, currentColor 12%, transparent);
}
.brand-quickadd-scope .rs-chip.rs-chip--selected,
.brand-quickadd-scope [data-chip][data-selected="true"] {
  background: transparent;
  border-color: var(--brand-elev-bd, rgba(0,0,0,.22)); }
  
      `}</style>
        {/* Report Modal */}
      {/* Report Modal (homepage-like) */}
      <ReportModal
        open={reportOpen}
        presets={REPORT_PRESETS}
        preset={reportPreset}
        details={reportDetails}
        submitting={reportSubmitting}
        error={reportError}
        onClose={() => setReportOpen(false)}
        onSubmit={submitReport}
        onSelectPreset={(v) => setReportPreset(v as typeof REPORT_PRESETS[number])}
        onChangeDetails={(v) => setReportDetails(v)}
      />
      {reportSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[210]">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm font-medium">Rapor alındı</span>
          </div>
        </div>
      )}
    </section>
  );
}
