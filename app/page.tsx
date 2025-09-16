  'use client';
  // --- PAYLAŞIM YARDIMCILARI ---
  
function buildShareUrl(id: string) {
  return `${window.location.origin}/share/${id}`;
}
// en üstte
async function copyShareLink(id: string) {
  const url = buildShareUrl(id);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    return true;
  } catch {
    return false;
  }
}
async function nativeShare(id: string, name: string) {
  const url = buildShareUrl(id);
  try {
    if (navigator.share) {
      await navigator.share({ title: `${name} — RateStuff`, text: 'RateStuff', url });
    } else {
      await copyShareLink(id);
    }
  } catch {}
}
import QuickAddHome from '@/components/home/QuickAddHome';
import ItemCard from '@/components/items/ItemCard';
import Head from 'next/head';
import SpotlightCard from '@/components/home/spotlight/SpotlightCard';
import ScrollToTop from "@/components/common/ScrollToTop";
import Pager from '@/components/common/Pager';

import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import starLoaderAnim from '@/assets/animations/star-loader.json';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Header from '@/components/header/Header';
import { useSession } from 'next-auth/react';
import ReportModal from '@/components/common/ReportModal';
import TrendingTagsCard from '@/components/home/TrendingTagsCard';
import AllTagsCard from '@/components/home/AllTagsCard';
import SortAndStarsCard from '@/components/home/SortAndStarsCard';

const ADMIN_EMAIL = 'ratestuffnet@gmail.com';


// --- 401'de otomatik signin'e yönlendiren fetch ---
async function fetchOrSignin(url: string, init?: RequestInit) {
  const res = await fetch(url, init);

  if (res.redirected) { window.location.href = res.url; return null; }
  if (res.status === 401) {
    const back = encodeURIComponent(window.location.href);
    window.location.href = `/api/auth/signin?callbackUrl=${back}`;
    return null;
  }
  return res;
}

type ItemVM = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
    productUrl?: string | null;
  avg: number | null;
  avgRating?: number | null;
  count: number;
  myRating?: number | null;
  edited?: boolean;
  suspended?: boolean;
  createdBy?: {
    id: string;
    name: string;
    maskedName?: string | null;
    avatarUrl?: string | null;
    verified?: boolean;
    kind?: "REGULAR" | "BRAND" | string | null;
  } | null;
  comments: {
    id: string;
    text: string;
    rating?: number | null;
    score?: number | null;              // toplam oy (up - down)
    myVote?: 1 | -1 | 0 | null;         // kullanıcının mevcut oyu
    edited?: boolean;
    user?: {
      id?: string;
      name?: string | null;
      maskedName?: string | null;
      avatarUrl?: string | null;
      verified?: boolean;
      kind?: "REGULAR" | "BRAND" | string | null;
    };
    images?: {
      id?: string;
      url: string;
      width?: number;
      height?: number;
      blurDataUrl?: string;
      order?: number;
    }[];
  }[];
  tags: string[];
  reportCount?: number;
};


export default function HomePage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [qInput, setQInput] = useState('');
  const [qCommitted, setQCommitted] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleOnQ = useCallback((v: any) => {
    const s = typeof v === 'string' ? v : (v?.target?.value ?? '');
    setQInput(s);
  }, []);

  const handleOnCommit = useCallback((v?: any) => {
    const s = typeof v === 'string' ? v : qInput;
    setQCommitted(s);
  }, [qInput]);

  const [order, setOrder] = useState<'new' | 'top'>('new');
  const [items, setItems] = useState<ItemVM[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  // Pagination
  const PER_PAGE = 8;
  const [page, setPage] = useState(1);
  // Arama kutusundaki yazıya göre etiket eşleşmeleri (ilgili etiketler)
  const tagHits = useMemo(() => {
    const s = qInput.trim().toLowerCase();
    if (!s) return [] as string[];
    // trending + allTags birleşimi, mükerrerleri kaldır
    const pool = Array.from(new Set([...(trending || []), ...(allTags || [])]));
    return pool.filter(t => t.toLowerCase().includes(s)).slice(0, 12);
  }, [qInput, allTags, trending]);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<LottieRefCurrentProps>(null);
  useEffect(() => {
    // Lottie bileşenine hız uygula (prop olarak 'speed' desteklenmiyor)
    try { loaderRef.current?.setSpeed(1.8); } catch {}
  }, [loading]);
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openMenu, setOpenMenu] = useState<{ scope: 'list' | 'spot'; id: string } | null>(null);
  const [openShare, setOpenShare] = useState<{ scope: 'list' | 'spot'; id: string } | null>(null);
  // state’lerin arasına ekle (openShare’in hemen altı mantıklı)
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
// spotlight comment highlight from URL (?comment=<id>)
const [sharedCommentId, setSharedCommentId] = useState<string | null>(null);
  // REPORT UI state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  // hazır sebepler + diğer
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
  const [reportPreset, setReportPreset] = useState<(typeof REPORT_PRESETS)[number] | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

const handleCopyShare = async (id: string) => {
  const ok = await copyShareLink(id);
  if (ok) {
    setCopiedShareId(id);
    setTimeout(() => setCopiedShareId(null), 1600);
  }
};

// share menü kapanınca “Kopyalandı!” yazısını sıfırla
useEffect(() => {
  if (!openShare) setCopiedShareId(null);
}, [openShare]);


  // Quick-add: tag suggestions (trending when empty, filtered allTags when typing)

   
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [starBuckets, setStarBuckets] = useState<Set<number>>(new Set());
  // Yorum düzenleme state'i
  const [editingCommentId, setEditingCommentId] = useState<string|null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingCommentItem, setEditingCommentItem] = useState<string|null>(null);
  const [editingCommentRating, setEditingCommentRating] = useState<number>(0);
  // Silme için onay durumu (tek id tutar)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);
  // Çoklu etiket seçimi için state
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  // Yorumlarda "devamını gör" için açılanlar
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  // Yorumlarda gerçek (görsel) truncation tespiti için
  const [truncatedComments, setTruncatedComments] = useState<Set<string>>(new Set());
  const commentTextRefs = useRef<Record<string, HTMLDivElement | null>>({});
const firstAnimDoneRef = useRef<{[k in -1 | 1]: boolean}>({ [-1]: false, [1]: false });
  const [spotlightShowCount, setSpotlightShowCount] = useState(7);
  // Hızlı ekle spotlight kontrolü
  const [showQuickAdd, setShowQuickAdd] = useState(false);


  function measureTruncation(id: string) {
    const el = commentTextRefs.current[id];
    if (!el) return;
    const over = el.scrollWidth > el.clientWidth; // 'truncate' tek satırda keserse scrollWidth > clientWidth olur
    setTruncatedComments((prev) => {
      const next = new Set(prev);
      if (over) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // item/yorum listesi değiştiğinde ve pencerede yeniden boyutlandığında tekrar ölç
  useEffect(() => {
    const ids = Object.keys(commentTextRefs.current);
    ids.forEach((id) => measureTruncation(id));
    function onResize() {
      const ids2 = Object.keys(commentTextRefs.current);
      ids2.forEach((id) => measureTruncation(id));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [items]);
  // — Paylaş linkinden gelen tek öğeyi (spotlight) göstermek için
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [sharedItem, setSharedItem] = useState<ItemVM | null>(null);
  useEffect(() => { setSpotlightShowCount(7); }, [sharedId, sharedItem?.id]);

  // sharedItem değiştiğinde de truncation ölç
  useEffect(() => {
    const ids = Object.keys(commentTextRefs.current);
    ids.forEach((id) => measureTruncation(id));
  }, [sharedItem]);

  // Spotlight yardımcıları
  async function refreshShared(id: string) {
    try {
      const r = await fetch(`/api/items?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const j = await r.json().catch(() => null);
      const arr = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : (j?.item ? [j.item] : []));
      setSharedItem(arr[0] || null);
    } catch {
      // yut
    }
  }
  function closeSpotlight() {
    setSharedItem(null);
    setSharedId(null);
   try {
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.searchParams.delete('item');
  url.searchParams.delete('comment');
  window.history.replaceState({}, '', url.toString());
} catch {}
  }
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const pendingSpotlightScrollRef = useRef(false);
  const [navDir, setNavDir] = useState<0 | 1 | -1>(0); // 0: yok, 1: sağa (next), -1: sola (prev)
  const [animKey, setAnimKey] = useState(0);
  const [animArmed, setAnimArmed] = useState(false);

  // Aktif oturum (sadece kendi yorumlarım için çöp kutusunu gösterebilmek adına)
  const { data: session } = useSession();
  const myId = (session as any)?.user?.id ?? null;
  const amAdmin = Boolean((session as any)?.user?.isAdmin) || ((session as any)?.user?.email === ADMIN_EMAIL);
  const isBrandUser = ((session as any)?.user?.kind ?? '').toUpperCase?.() === 'BRAND';
  async function loadSavedIds() {
    try {
      const r = await fetch('/api/items/saved-ids', { cache: 'no-store' });
      if (!r.ok) { setSavedIds(new Set()); return; }
      const j = await r.json().catch(() => null);
      const ids: string[] = Array.isArray(j?.ids) ? j.ids : [];
      setSavedIds(new Set(ids));
    } catch {
      setSavedIds(new Set());
    }
  }

  // JSON'u güvenle diziye çevir (API bazen {items:[...]} veya {data:[...]} döndürebilir)
  function toArray(v: any, ...keys: string[]) {
  // Çok yaygın adlar
  const COMMON = ['items', 'data', 'results', 'rows', ...keys];

  // Derin gez ve ilk karşılaşılan dizi alanı döndür
  function deepFind(obj: any, seen = new Set<any>()): any[] {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    if (typeof obj !== 'object') return [];

    // Doğrudan bilinen alanlar
    for (const k of COMMON) {
      const val = (obj as any)[k];
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'object' && !seen.has(val)) {
        seen.add(val);
        const arr = deepFind(val, seen);
        if (arr.length) return arr;
      }
    }

    // Her ihtimale karşı tüm değerleri dolaş
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'object' && !seen.has(val)) {
        seen.add(val);
        const arr = deepFind(val, seen);
        if (arr.length) return arr;
      }
    }
    return [];
  }

  if (Array.isArray(v)) return v;
  return deepFind(v);
}

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (qCommitted.trim()) qs.set('q', qCommitted.trim());
      qs.set('order', order);

      // Helper: fetchItemsRes
      async function fetchItemsRes(url: string, fallbackUrl: string) {
        // 1) Ana istek
        try {
          const r1 = await fetch(url, { cache: 'no-store' });
          let j1: any = null;
          try { j1 = await r1.json(); } catch { j1 = null; }
          const arr1 = toArray(j1, 'items', 'data');
          if (Array.isArray(arr1) && arr1.length > 0) return j1 ?? {};
          // Eğer dizi döndü ama boşsa veya parse edemediysek fallback dene
        } catch (e) {
          // yut, fallback dene
        }
        // 2) Fallback istek (parametresiz)
        try {
          const r2 = await fetch(fallbackUrl, { cache: 'no-store' });
          let j2: any = null;
          try { j2 = await r2.json(); } catch { j2 = null; }
          return j2 ?? {};
        } catch {
          return {};
        }
      }

      const [itemsRes, tagsRes, trendRes] = await Promise.all([
        (qCommitted.trim().length > 0
          ? fetch(`/api/items?${qs.toString()}`, { cache: 'no-store' })
              .then((r) => r.json())
              .catch(() => ({}))
          : fetchItemsRes(`/api/items?${qs.toString()}`, '/api/items')
        ),
        fetch('/api/tags', { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => ({})),
        fetch('/api/tags/trending', { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => ({})),
      ]);


      const _items = toArray(itemsRes, 'items', 'data');
      const _allTags = toArray(tagsRes, 'tags', 'data');
      const _trending = toArray(trendRes, 'tags', 'trending', 'data');

      setItems(Array.isArray(_items) ? _items : []);
      setAllTags(Array.isArray(_allTags) ? _allTags : []);
      setTrending(Array.isArray(_trending) ? _trending : []);
      
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); loadSavedIds(); }, []);
  // Global yardımcı: diğer bileşenler listayı tetikleyebilsin
  useEffect(() => {
    try {
      (window as any).ratestuff = {
        load,
        reload: load,
        closeQuickAdd: () => setShowQuickAdd(false),
        refreshAndCloseQuickAdd: () => { setShowQuickAdd(false); load(); },
      };
    } catch {}
    return () => {
      try { delete (window as any).ratestuff; } catch {}
    };
  }, [load]);
  // Dışarıdan (QuickAdd vs.) gelen listeyi yenile sinyali
  useEffect(() => {
    function onExternalReload() {
      try {
        // Quick Add ve Spotlight kapansın
        setShowQuickAdd(false);
        setSharedItem(null);
        setSharedId(null);
        // Filtreleri ve aramayı temizle
        setSelectedTags(new Set());
        setStarBuckets(new Set());
        setOrder('new');
        setQInput('');
        setQCommitted('');
        // Yukarı kaydır
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
      } catch {}
      load();
    }
    window.addEventListener('ratestuff:items:reload', onExternalReload as any);
    return () => window.removeEventListener('ratestuff:items:reload', onExternalReload as any);
  }, []);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      // close both menus if any is open and click is not on a menu button or popover
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.rs-pop')) return;
      setOpenMenu(null);
      setOpenShare(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);
  // URL'den ?item=... yakala ve spotlight için hazırla
  // Parse spotlight params on mount (normalize /share/:id -> /?item=)
useEffect(() => {
  try {
    const u = new URL(window.location.href);
    const m = u.pathname.match(/^\/share\/([^/?#]+)/);
    if (m && m[1]) {
      const legacyId = m[1];
      setSharedId(legacyId);
      u.pathname = '/';
      u.searchParams.set('item', legacyId);
      window.history.replaceState({}, '', u.toString());
    } else {
      const id = u.searchParams.get('item');
      setSharedId(id);
    }
    const c = u.searchParams.get('comment');
    setSharedCommentId(c);
  } catch {}
}, []);
  // Hash'ten #quick-add yakala → Hızlı Ekle'yi aç
  useEffect(() => {
    function syncFromHash() {
      try {
        const hash = window.location.hash;
        if (hash === '#quick-add') {
          setShowQuickAdd(true);
        }
      } catch {}
    }
    // mount'ta ve her hash değişiminde çalıştır
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);
  // sharedId değişince tek öğeyi çek (listeye karışmadan üstte göstereceğiz)
  useEffect(() => {
    let aborted = false;
    async function run() {
      if (!sharedId) { setSharedItem(null); return; }
      try {
        const r = await fetch(`/api/items?id=${encodeURIComponent(sharedId)}`, { cache: 'no-store' });
        const j = await r.json().catch(() => null);
        const arr = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : (j?.item ? [j.item] : []));
if (!aborted) setSharedItem(arr[0] || null);
try { const u = new URL(window.location.href); setSharedCommentId(u.searchParams.get('comment')); } catch {}      } catch {
        if (!aborted) setSharedItem(null);
      }
    }
    run();
    return () => { aborted = true; };
  }, [sharedId]);

  useEffect(() => {
    let aborted = false;
    async function run() {
      const typed = qInput.trim();
      if (!typed || typed === qCommitted) { setSuggestions([]); return; }
      try {
        const r = await fetch(`/api/items?q=${encodeURIComponent(typed)}&limit=10`, { cache: 'no-store' });
        const j = await r.json().catch(() => null);
        const arr = toArray(j, 'items', 'data');
        const names: string[] = Array.isArray(arr)
          ? Array.from(new Set(arr.map((x:any) => String(x?.name || '').trim()).filter(Boolean)))
          : [];
        if (!aborted) setSuggestions(names.slice(0, 10));
      } catch {
        if (!aborted) setSuggestions([]);
      }
    }
    const id = setTimeout(run, 150);
    return () => { aborted = true; clearTimeout(id); };
  }, [qInput, qCommitted]);
  useEffect(() => {
  load();
}, [qCommitted, order]);

  // Kaldırıldı: activeTag ve single-tag selection, çoklu seçim state'e taşındı

  // Yıldız filtresi: ortalama 3.67 → 4 yıldız kovasına girer
  function bucketOf(avg: number | null): number | null {
    if (!avg || avg <= 0) return null;
    return Math.ceil(avg);
  }

  // --- Preview/deleting logic ---
  // Compute deleting and isPreviewing
  const deleting =
    qCommitted.length > 0 &&
    qCommitted.startsWith(qInput) &&
    qInput.length < qCommitted.length;
  const isPreviewing =
    (qInput.trim().length > 0) &&
    (qInput !== qCommitted) &&
    !deleting;

  // Reset to full list when clearing or deleting
  useEffect(() => {
    // If user cleared the input OR started deleting from the committed query,
    // reset committed search so we show the full default list.
    if (!qCommitted) return;
    const cleared = qInput.trim().length === 0;
    const startedDeleting =
      qCommitted.length > 0 &&
      qCommitted.startsWith(qInput) &&
      qInput.length < qCommitted.length;
    if (cleared || startedDeleting) {
      setQCommitted('');
      setSuggestions([]);
      
    }
  }, [qInput, qCommitted]);

  // Filtreleme ve sıralama: yıldız, çoklu etiket ve "top" sıralaması
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (starBuckets.size > 0) {
      filtered = filtered.filter(i => {
        const b = bucketOf(i.avg);
        return b !== null && starBuckets.has(b);
      });
    }
    if (selectedTags.size > 0) {
      filtered = filtered.filter(i =>
        Array.from(selectedTags).every(tag => i.tags.includes(tag))
      );
    }

    // Sort by most liked when order === 'top'
    if (order === 'top') {
      filtered = [...filtered].sort((a, b) => {
        const ar = (a.avgRating ?? a.avg ?? 0);
        const br = (b.avgRating ?? b.avg ?? 0);
        if (br !== ar) return br - ar; // higher average first
        const ac = (a.count ?? 0);
        const bc = (b.count ?? 0);
        if (bc !== ac) return bc - ac; // more ratings first
        return 0;
      });
    }

    return filtered;
  }, [items, starBuckets, selectedTags, order]);

  // Derived: total pages and current slice
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PER_PAGE));
  const pageStart = Math.min((page - 1) * PER_PAGE, Math.max(0, (totalPages - 1) * PER_PAGE));
  const pageItems = filteredItems.slice(pageStart, pageStart + PER_PAGE);

  // Reset to page 1 when filters/search/order change
  useEffect(() => {
    setPage(1);
  }, [qCommitted, order, Array.from(starBuckets).join(','), Array.from(selectedTags).join(',')]);

  // Clamp page when filteredItems length changes
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // Row-major iki sütuna böl (1: sol, 2: sağ, 3: sol, 4: sağ ...)
  const itemsWithAdd = useMemo(() => {
    if (loading) return pageItems;
    // "+ Ekle" kartını her sayfanın en başına yerleştir
    return [{ __add: true } as any, ...pageItems];
  }, [pageItems, loading]);
  const [colLeft, colRight] = useMemo(() => {
    const L: any[] = [];
    const R: any[] = [];
    itemsWithAdd.forEach((it, idx) => {
      (idx % 2 === 0 ? L : R).push(it);
    });
    return [L, R];
  }, [itemsWithAdd]);

  // Ref for list top to scroll into view on page change
  const listTopRef = useRef<HTMLDivElement>(null);

  // Pager helpers
  function goToPage(next: number) {
    const p = Math.max(1, Math.min(totalPages, next));
    if (p === page) return;
    setPage(p);
    // scroll to list section top for better UX
    const el = listTopRef.current;
    if (el) {
      try {
        const rect = el.getBoundingClientRect();
        const y = rect.top + window.scrollY - headerOffset();
        smoothScrollToY(y);
      } catch {
        window.scrollTo(0, 0);
      }
    }
  }


  // Spotlight gezinme: aktif index ve yardımcılar
  const currentIndex = useMemo(
    () => (sharedItem ? filteredItems.findIndex(i => i.id === sharedItem.id) : -1),
    [sharedItem, filteredItems]
  );

  function openByIndex(idx: number, fromDelta: boolean = false) {
    if (idx < 0 || idx >= filteredItems.length) return;
    openSpotlight(filteredItems[idx].id, fromDelta);
  }
  function openByDelta(d: number) {
    if (currentIndex < 0) return;
    const next = currentIndex + d;
    if (next < 0 || next >= filteredItems.length) return; // wrap yok
    // Önce sınıfı baskılamamız lazım; yeni içerik mount olduktan sonra tek sefer oynatacağız
    setAnimArmed(false);
    requestAnimationFrame(() => setAnimArmed(false)); // bazı tarayıcılarda reflow gecikmesine karşı
    setNavDir(d > 0 ? 1 : -1);
    openByIndex(next, true);
  }

  async function addItem(form: FormData) {
    setAdding(true);
    try {
      const payload = {
        name: String(form.get('name') || ''),
        description: String(form.get('desc') || ''),
        tagsCsv: String(form.get('tags') || ''),
        rating: Number(form.get('rating') || '0'),
        comment: String(form.get('comment') || ''),
        imageUrl: String(form.get('imageUrl') || '') || null,
        productUrl: String(form.get('productUrl') || '') || null,
      };
      const res = await fetchOrSignin('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res) return false;
      let j: any = null;
      try { j = await res.json(); } catch { j = null; }
      // success if HTTP 2xx and either {ok:true} OR no explicit ok:false in payload
      const httpOk = res.ok;
      const okFlag = typeof j?.ok === 'boolean' ? j.ok : undefined;
      const success = httpOk && (okFlag !== false);
      if (success) {
        setQInput('');
        setQCommitted('');
        await load();
        return { ok: true };
      }
      const err = String(j?.error || '');
      const isDuplicate =
        res.status === 409 ||
        /P2002/.test(err) ||
        /Unique constraint/i.test(err) ||
        (/unique/i.test(err) && /name/i.test(err));
      if (isDuplicate) {
        return { ok: false, duplicate: true, error: 'Bu adla zaten bir öğe var.' };
      }
      return { ok: false, error: err || `${res.status} ${res.statusText}` };
    } finally {
      setAdding(false);
    }
  }

  async function deleteComment(commentId: string) {
    // Önce /api/comments/:id (çoğul) dener
    let res = await fetchOrSignin(`/api/comments/${commentId}`, { method: 'DELETE' });
    // Signin'e yönlendirilmiş olabilir
    if (!res) return;

    // Sunucu bu rotada DELETE desteklemiyorsa (405/404), tekil rotayı dene
    if (res.status === 405 || res.status === 404) {
      res = await fetchOrSignin(`/api/comment/${commentId}`, { method: 'DELETE' });
      if (!res) return;
    }

    let j: any = null;
    try { j = await res.json(); } catch {}

    if (res.ok && (j?.ok ?? true)) {
      await load();
      if (sharedId) {
        await refreshShared(sharedId);
      }
    } else {
      alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
    }
  }

   async function voteOnComment(commentId: string, nextValue: 1 | -1 | 0) {
  const res = await fetchOrSignin(`/api/comments/${commentId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: nextValue })
  });
  if (!res) return;
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) {
    alert('Hata: ' + (j?.error || res.status));
    return;
  }
    await load();
    if (sharedId) await refreshShared(sharedId);
  }
  
  async function updateComment(commentId: string, text: string, itemId?: string, rating?: number) {
    // 1) /api/comments/:id (çoğul) → PATCH
    let res = await fetchOrSignin(`/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, rating })
    });
    if (res && res.ok) {
      await load();
      if (sharedId) {
        await refreshShared(sharedId);
      }
      return true;
    }

    // 2) Yedek rota: /api/items/:itemId/comments → PATCH (commentId + text)
    if (itemId) {
      res = await fetchOrSignin(`/api/items/${itemId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: commentId, text, rating })
      });
      if (res && res.ok) {
        await load();
        if (sharedId) {
          await refreshShared(sharedId);
        }
        return true;
      }
    }

    // Hata
    const j = res ? (await res.json().catch(()=>null)) : null;
    alert('Hata: ' + (j?.error || (res ? `${res.status} ${res.statusText}` : 'yorum güncellenemedi')));
    return false;
  }

  async function toggleSave(id: string) {
    const wasSaved = savedIds.has(id);
    // optimistic
    setSavedIds(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(id); else next.add(id);
      return next;
    });

    const method = wasSaved ? 'DELETE' : 'POST';
    const res = await fetchOrSignin(`/api/items/${id}/save`, { method });
    if (!res) { // signin'e yönlendirildiyse geri al
      setSavedIds(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(id); else next.delete(id);
        return next;
      });
      return;
    }
    const j = await res.json().catch(() => null);
    if (!j?.ok) {
      setSavedIds(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(id); else next.delete(id);
        return next;
      });
      alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
      return;
    }
    setOpenMenu(null);
    await loadSavedIds();
  }

  async function rate(id: string, value: number) {
    const res = await fetchOrSignin(`/api/items/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
    if (!res) return;
    const j = await res.json().catch(() => null);
    if (j?.ok) await load(); else alert('Hata: ' + (j?.error || res.status));
  }

  async function sendComment(itemId: string) {
    const text = (drafts[itemId] || '').trim();
    if (!text) return;

    const res = await fetchOrSignin(`/api/items/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res) return;
    const j = await res.json().catch(() => null);
    if (j?.ok) {
      setDrafts(d => ({ ...d, [itemId]: '' }));
      await load();
      if (sharedId && itemId === sharedId) {
        await refreshShared(itemId);
      }
    } else alert('Hata: ' + (j?.error || res.status));
  }

  async function report(id: string) {
    // open in-app modal instead of prompt/alert
    setReportTargetId(id);
    setReportPreset('');
    setReportDetails('');
    setReportError(null);
    setReportOpen(true);
  }

  async function submitReport() {
    if (!reportTargetId) return;
    const preset = String(reportPreset || '').trim();
    const details = String(reportDetails || '').trim();
    if (!preset) { setReportError('Lütfen bir sebep seç.'); return; }
    if (preset === 'Diğer' && !details) { setReportError('Diğer seçildi, lütfen sebebi yaz.'); return; }
    const finalReason = preset === 'Diğer' ? details : (details ? `${preset} — ${details}` : preset);
    setReportSubmitting(true);
    setReportError(null);
    const res = await fetchOrSignin(`/api/items/${reportTargetId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: finalReason })
    });
    setReportSubmitting(false);
    if (!res) return; // auth redirect handled
    let j: any = null; try { j = await res.json(); } catch {}
    if (res.ok && j?.ok) {
      setReportOpen(false);
      setReportTargetId(null);
      setReportPreset('');
      setReportDetails('');
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 1600);
      if (sharedId) { try { await refreshShared(sharedId); } catch {} }
    } else {
      setReportError(j?.error || `${res.status} ${res.statusText}`);
    }
  }
  // Escape-to-close for report modal
  useEffect(() => {
    if (!reportOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setReportOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reportOpen]);

  async function deleteItem(id: string) {
    const res = await fetchOrSignin(`/api/items/${id}`, { method: 'DELETE' });
    if (!res) return;
    const j = await res.json().catch(() => null);
    if (res.ok && (j?.ok ?? true)) {
      await load();
    } else {
      alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
    }
  }

  // Bir kartı pürüzsüz şekilde öne getir
  function headerOffset() {
    // Gerçek header yüksekliğini ölç, yoksa daha küçük bir mobil varsayılan kullan
    try {
      const header = document.querySelector('header');
      if (header) {
        const h = Math.round(header.getBoundingClientRect().height);
        // küçük bir güvenlik payı ekle (8px)
        return Math.max(48, Math.min(120, h + 8));
      }
    } catch {}
    const w = window.innerWidth || 0;
    // mobilde önceki 80px çoktu; 64 daha doğru hizalanıyor
    return w < 640 ? 64 : 96;
  }
function smoothScrollToY(y: number) {
  try {
    window.scrollTo({ top: y, behavior: 'smooth' });
  } catch {
    window.scrollTo(0, y);
  }
}
function smoothScrollIntoView(el: Element) {
  const rect = el.getBoundingClientRect();
  const y = rect.top + window.scrollY - headerOffset();
  smoothScrollToY(y);
}
  function scrollToItem(id: string) {
    const el = itemRefs.current[id];
    if (!el) return;
    smoothScrollIntoView(el);
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 1600);
  }

  // Spotlight kartındaki "Listede göster" davranışı — spotlight'ı kapatma; sadece listede ilgili karta kaydır + highlight
  function showInList(id: string) {
    try {
      // Görsel kirlilik olmasın diye açık popoverları kapat; spotlight açık kalsın
      setOpenMenu(null);
      setOpenShare(null);
      // Doğrudan griddeki karta kaydır + highlight
      scrollToItem(id);
    } catch {}
  }

  

  function openSpotlight(id: string, fromDelta: boolean = false) {
    setShowQuickAdd(false);
    if (!fromDelta) setNavDir(0);
    setSharedId(id);
    try {
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.searchParams.set('item', id);
  // stale highlight'ı önlemek için comment paramını temizle
  if (url.searchParams.has('comment')) url.searchParams.delete('comment');
  window.history.replaceState({}, '', url.toString());
} catch {}
    if (!fromDelta) {
      pendingSpotlightScrollRef.current = true;
    }
  }
  // Try to find & flash-highlight a comment by id
function highlightCommentInline(commentId: string) {
  const sel = `[data-comment-id="${CSS.escape(commentId)}"]`;
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) return false;

  const prevOutline = el.style.outline;
  const prevBoxShadow = el.style.boxShadow;
  const prevBorderRadius = el.style.borderRadius;

  el.style.outline = '3px solid var(--brand-ink, #2563eb)';
  el.style.borderRadius = '12px';
  el.style.boxShadow = '0 0 0 8px rgba(37, 99, 235, 0.15)';
  try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { el.scrollIntoView({ block: 'center' }); }

  setTimeout(() => {
    el.style.outline = prevOutline;
    el.style.boxShadow = prevBoxShadow;
    el.style.borderRadius = prevBorderRadius;
  }, 2500);
  return true;
}

// When we have an item open and a comment id in URL, attempt highlight
useEffect(() => {
  if (!sharedItem || !sharedCommentId) return;
  let cancelled = false;
  if (highlightCommentInline(sharedCommentId)) return;

  const started = Date.now();
  const timer = window.setInterval(() => {
    if (cancelled) return;
    if (highlightCommentInline(sharedCommentId)) {
      window.clearInterval(timer);
      return;
    }
    if (Date.now() - started > 5000) window.clearInterval(timer);
  }, 150);
  return () => { cancelled = true; window.clearInterval(timer); };
}, [sharedItem, sharedCommentId]);

// Spotlight içerik yüklendiğinde (sharedItem mount olduğunda) bekleyen scroll'u uygula
useEffect(() => {
    if (pendingSpotlightScrollRef.current && sharedItem) {
      pendingSpotlightScrollRef.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = spotlightRef.current;
          if (el) smoothScrollIntoView(el);
        });
      });
    }
  }, [sharedItem]);

  // Klavye kısayolları: ← → ile spotlight'ta gezin (form alanlarında devre dışı)
  useEffect(() => {
    if (!sharedItem) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      if (e.key === 'ArrowLeft') { e.preventDefault(); openByDelta(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); openByDelta(1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sharedItem, currentIndex, filteredItems.length]);

  // Mobil swipe jestleri (spotlight alanında yatay kaydırma)
  useEffect(() => {
    const el = spotlightRef.current;
    if (!el || !sharedItem) return;
    let x0 = 0, y0 = 0, t0 = 0;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
    }
    function onEnd(e: TouchEvent) {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      const dt = Date.now() - t0;
      // yatay baskın ve yeterli mesafe/hız
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && dt < 600) {
        if (dx < 0) openByDelta(1);   // sola kaydırdı → sonraki
        else openByDelta(-1);         // sağa kaydırdı → önceki
      }
    }

    // Not: TS için passive opsiyonunu any ile geçiyoruz
    el.addEventListener('touchstart', onStart as any, { passive: true } as any);
    el.addEventListener('touchend', onEnd as any, { passive: true } as any);
    return () => {
      el.removeEventListener('touchstart', onStart as any);
      el.removeEventListener('touchend', onEnd as any);
    };
  }, [spotlightRef, sharedItem, currentIndex, filteredItems.length]);

  // Her delta gezinmede yeni içeriğe geçtikten sonra animasyonu yeniden tetiklemek için
  useEffect(() => {
    if (navDir !== 0 && sharedItem?.id) {
      // Yeni içerik geldikten sonra tek seferlik animasyonu tetikle
      setAnimKey(k => k + 1);
const already = firstAnimDoneRef.current[navDir];
if (!already) {
  const id = requestAnimationFrame(() => setAnimArmed(true));
  firstAnimDoneRef.current[navDir] = true;
  return () => cancelAnimationFrame(id);
} else {
  setAnimArmed(true);
}
    }
  }, [sharedItem?.id, navDir]);



  

  // Quick-add spotlight kapanınca formu ve alanları sıfırla





  // Dispatch header controls to layout when dependencies change
  useEffect(() => {
    const detail = {
      q: qInput,
      onQ: handleOnQ,
      order,
      onOrder: setOrder,
      starBuckets: Array.from(starBuckets),
      onStarBuckets: (arr: number[]) => setStarBuckets(new Set(arr)),
      onCommit: handleOnCommit,
      onSearch: handleOnCommit,
      suggestions,
      onClickSuggestion: (s: string) => { handleOnQ(s); handleOnCommit(s); },
      tagMatches: tagHits,
      onClickTagMatch: (t: string) => {
        if (!t) return;
        setSelectedTags(prev => { const next = new Set(prev); next.add(t); return next; });
        setQCommitted(qInput);
        setShowQuickAdd(false);
        setSharedItem(null);
        setSharedId(null);
      },
      showSuggestions: qInput !== qCommitted,
    };
    window.dispatchEvent(new CustomEvent('rs:setHeaderControls', { detail }));
  }, [qInput, qCommitted, order, starBuckets, suggestions, tagHits, handleOnQ, handleOnCommit]);

  // --- SEO: JSON-LD (WebSite + Organization) ---
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ratestuff.net").replace(/\/+$/, "");
  const websiteLD = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RateStuff",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  const orgLD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RateStuff",
    url: base,
    logo: `${base}/logo.svg`,
  };
  const canonicalShareUrl = sharedId ? `${base}/share/${sharedId}` : null;
  const itemLD = sharedItem ? {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: sharedItem.name || "RateStuff içeriği",
    description: sharedItem.description || undefined,
    url: canonicalShareUrl || undefined,
    mainEntityOfPage: canonicalShareUrl || undefined,
    image: sharedItem.imageUrl || undefined,
    ...(typeof (sharedItem.avg ?? sharedItem.avgRating) === 'number' && (sharedItem.count ?? 0) > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(((sharedItem.avg ?? sharedItem.avgRating) as number).toFixed(2)),
            ratingCount: sharedItem.count ?? undefined,
          },
        }
      : {}),
  } : null;
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {canonicalShareUrl && (
        <Head>
          <link rel="canonical" href={canonicalShareUrl} />
        </Head>
      )}
     
     
     
     <style jsx global>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-4px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
       @keyframes slideInFromLeft {
  0% { opacity: 0; transform: translate3d(-10px,0,0); }
  100% { opacity: 1; transform: translate3d(0,0,0); }
}
@keyframes slideInFromRight {
  0% { opacity: 0; transform: translate3d(10px,0,0); }
  100% { opacity: 1; transform: translate3d(0,0,0); }
}
.animate-slideInFromLeft { animation: slideInFromLeft .14s cubic-bezier(0.22,1,0.36,1); will-change: transform; }
.animate-slideInFromRight { animation: slideInFromRight .14s cubic-bezier(0.22,1,0.36,1); will-change: transform; }
        @media (prefers-reduced-motion: reduce) {
          .animate-slideInFromLeft, .animate-slideInFromRight { animation-duration: .01ms; animation-iteration-count: 1; }
        }
         .title-wrap {
  word-break: normal;       /* kelimeyi zorla bölme */
  overflow-wrap: anywhere;  /* gerekirse uygun yerde böl */
  hyphens: auto;
}
@media (min-width: 768px) {
  .md-clamp2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
       @media (max-width: 767px) {
      /* Mobilde item grid'i filtrelerle aynı hatta hizala */
      .rs-mobile-edge {
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      /* Ensure children can't shift the column horizontally when data arrives */
      .rs-mobile-edge > * {
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
    }

    /* Hard stop any horizontal growth on mobile when item cards mount */
    @media (max-width: 767px) {
      .rs-mobile-edge { overflow-x: clip; }
      .rs-mobile-edge,
      .rs-mobile-edge > * {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .rs-mobile-edge * {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      /* Prevent flex/grids from enforcing min-content width on mobile */
      .rs-mobile-edge * { min-width: 0 !important; }
      .rs-mobile-edge img,
      .rs-mobile-edge video,
      .rs-mobile-edge canvas,
      .rs-mobile-edge iframe {
        max-width: 100% !important;
      }
      /* Exempt floating popovers from the mobile width clamp */
      .rs-mobile-edge .rs-pop,
      .rs-mobile-edge .rs-pop * {
        max-width: none !important;
      }
    }
      /* Tablet (md) aralığında kartların aşırı daralmasını engelle */
@media (min-width: 768px) and (max-width: 1024px) {
  /* item kartlarını taşıyan grid kapsayıcısına rs-grid sınıfı ekleyeceğiz */
  .rs-mobile-edge .rs-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
  }
}
  /* ---- Quick Add transparent input backgrounds (iOS/Safari safe) ---- */
.rs-quickadd input:not([type="hidden"]),
.rs-quickadd textarea{
  background-color: transparent !important;
  -webkit-appearance: none;
  appearance: none;
  background-clip: padding-box;
  -webkit-background-clip: padding-box;
  caret-color: currentColor;
}

/* WebKit autofill overlay’ini şeffaf boya */
.rs-quickadd input:-webkit-autofill,
.rs-quickadd input:-webkit-autofill:hover,
.rs-quickadd input:-webkit-autofill:focus,
.rs-quickadd textarea:-webkit-autofill,
.rs-quickadd textarea:-webkit-autofill:hover,
.rs-quickadd textarea:-webkit-autofill:focus{
  -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
  box-shadow: 0 0 0 1000px transparent inset !important;
  -webkit-text-fill-color: inherit;
  transition: background-color 9999s ease-out 0s;
}
      /* Listede göster → geçici vurgu */
      .rs-flash { outline: 2px solid rgb(16 185 129 / 0.9); outline-offset: 2px; }

      /* Masonry (2 sütun, bağımsız düşen kartlar) */
      .rs-masonry { column-gap: 1rem; } /* ~ gap-4 */
      .rs-masonry-item {
        break-inside: avoid;
        -webkit-column-break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 1.25rem; /* kartlar arası dikey boşluğu artır (20px ~ mb-5) */
      }
      `}
      </style>
      

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Sol: etiketler */}
        <aside className="hidden md:block">
         
          <TrendingTagsCard
            tags={trending}
            selected={selectedTags}
            onToggle={(t) => {
              setSelectedTags(prev => {
                const next = new Set(prev);
                if (next.has(t)) next.delete(t); else next.add(t);
                return next;
              });
            }}
            onClearAll={() => setSelectedTags(new Set())}
            defaultOpen={true}
          />

          <div className="h-4" />

          <AllTagsCard
            tags={allTags}
            trending={trending}
            selected={selectedTags}
            onToggle={(t) => {
              setSelectedTags(prev => {
                const next = new Set(prev);
                if (next.has(t)) next.delete(t); else next.add(t);
                return next;
              });
            }}
            onClearAll={() => setSelectedTags(new Set())}
            defaultOpen={false}
          />
          <SortAndStarsCard
            order={order}
            onOrder={setOrder}
            starBuckets={starBuckets}
            onToggleStar={(n) => {
              setStarBuckets(prev => {
                const next = new Set(prev);
                if (next.has(n)) next.delete(n); else next.add(n);
                return next;
              });
            }}
            onClearStars={() => { setStarBuckets(new Set()); setQInput(''); setQCommitted(''); }}
            compact={false}
            className="mt-4"
          />
        </aside>

        {/* Sağ: listeler */}
        <section ref={listTopRef} className="rs-mobile-edge space-y-4 order-2 md:order-2">


          {/* QUICK-ADD SPOTLIGHT (moved into list column) */}
{showQuickAdd && (
  <QuickAddHome
    open
    variant="rich"
    isBrandUser={isBrandUser}
    autoCloseOnSuccess={true}
    prefill={{
      name: (qCommitted || qInput).trim() || undefined,
      tags: selectedTags.size ? Array.from(selectedTags) : undefined,
      rating: starBuckets.size === 1 ? Array.from(starBuckets)[0] : undefined,
    }}
    trending={trending}
    allTags={allTags}
    onClose={() => {
      setShowQuickAdd(false);
      try {
        if (window.location.hash === '#quick-add') {
          const url = new URL(window.location.href);
          url.hash = '';
          window.history.replaceState({}, '', url.toString());
        }
      } catch {}
    }}
    onSubmit={async ({ name, desc, tags, rating, comment, imageUrl, productUrl }) => {
      const fd = new FormData();
      fd.set('name', name);
      fd.set('desc', desc);
      fd.set('tags', tags.join(','));
      fd.set('rating', String(rating));
      fd.set('comment', comment);
      fd.set('imageUrl', imageUrl ?? '');
      fd.set('productUrl', productUrl ?? '');
      return await addItem(fd);
    }}
  />
)}
          
          {/* Paylaşımdan gelen tek öğe (spotlight) */}
          {/* Sıralama başlığı — kartların hemen üstünde */}
          {!showQuickAdd && sharedItem && (
            <div ref={spotlightRef}>
              <SpotlightCard
                item={sharedItem}
                amAdmin={amAdmin}
                myId={myId}
                saved={savedIds.has(sharedItem.id)}
                // popovers
                openShareId={openShare?.scope === 'spot' ? openShare.id : null}
                setOpenShareId={(id) => setOpenShare(id ? { scope: 'spot', id } : null)}
                openMenuId={openMenu?.scope === 'spot' ? openMenu.id : null}
                setOpenMenuId={(id) => setOpenMenu(id ? { scope: 'spot', id } : null)}
                copiedShareId={copiedShareId}
                // actions
                onClose={closeSpotlight}
                onDelete={deleteItem}
                onToggleSave={toggleSave}
                onReport={report}
                onShowInList={showInList}
                onCopyShare={handleCopyShare}
                onNativeShare={nativeShare}
                // navigation
                index={currentIndex}
                count={filteredItems.length}
                onPrev={() => openByDelta(-1)}
                onNext={() => openByDelta(1)}
                animKey={animKey}
                animClass={
                  navDir === -1
                    ? animArmed ? 'animate-slideInFromLeft' : ''
                    : navDir === 1
                    ? animArmed ? 'animate-slideInFromRight' : ''
                    : ''
                }
                // comments / editing
                voteOnComment={voteOnComment}
                updateComment={updateComment}
                deleteComment={deleteComment}
                expandedComments={expandedComments}
                setExpandedComments={(fn) => setExpandedComments(prev => (typeof fn === 'function' ? fn(prev) : prev))}
                truncatedComments={truncatedComments}
                measureTruncation={measureTruncation}
                commentTextRefs={commentTextRefs}
                editingCommentId={editingCommentId}
                setEditingCommentId={setEditingCommentId}
                editingCommentText={editingCommentText}
                setEditingCommentText={setEditingCommentText}
                editingCommentItem={editingCommentItem}
                setEditingCommentItem={setEditingCommentItem}
                editingCommentRating={editingCommentRating}
                setEditingCommentRating={setEditingCommentRating}
                showCount={spotlightShowCount}
                setShowCount={(fn) => setSpotlightShowCount(typeof fn === 'function' ? fn : (n) => n)}
                onCommentDone={async () => {
                  await load();
                  await refreshShared(sharedItem.id);
                }}
              />
            </div>
          )}
          {/* MOBIL: Etiketler/Filtreler (spotlight altı) */}
<div className="md:hidden space-y-4">
  <TrendingTagsCard
    tags={trending}
    selected={selectedTags}
    onToggle={(t) => {
      setSelectedTags(prev => {
        const next = new Set(prev);
        if (next.has(t)) next.delete(t); else next.add(t);
        return next;
      });
    }}
    onClearAll={() => setSelectedTags(new Set())}
    defaultOpen={true}
  />

  <AllTagsCard
    tags={allTags}
    trending={trending}
    selected={selectedTags}
    onToggle={(t) => {
      setSelectedTags(prev => {
        const next = new Set(prev);
        if (next.has(t)) next.delete(t); else next.add(t);
        return next;
      });
    }}
    onClearAll={() => setSelectedTags(new Set())}
    defaultOpen={false}
  />

  <SortAndStarsCard
    order={order}
    onOrder={setOrder}
    starBuckets={starBuckets}
    onToggleStar={(n) => {
      setStarBuckets(prev => {
        const next = new Set(prev);
        if (next.has(n)) next.delete(n); else next.add(n);
        return next;
      });
    }}
    onClearStars={() => { setStarBuckets(new Set()); setQInput(''); setQCommitted(''); }}
    compact={true}
    className="mt-4"
  />
</div>


          {/* Filtre özet çubuğu + sonuç sayacı */}
      {(starBuckets.size > 0 || selectedTags.size > 0) && (
        <div className="rounded-2xl border p-3 bg-white dark:bg-gray-900 dark:border-gray-800 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm opacity-70">Filtreler:</span>
            {Array.from(starBuckets).sort().map((n) => (
              <button
                key={`star-chip-${n}`}
                type="button"
                className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700"
                onClick={() => {
                  setStarBuckets(prev => {
                    const next = new Set(prev);
                    next.delete(n);
                    return next;
                  });
                }}
                title={`${n} ★ filtresini kaldır`}
              >
                <span className="tabular-nums">{n} ★</span>
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="opacity-60 group-hover:opacity-100"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            ))}
            {Array.from(selectedTags).map((t) => (
              <button
                key={`sel-${t}`}
                type="button"
                className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-violet-500/10 text-violet-900 border-violet-300 hover:bg-violet-500/20 dark:bg-violet-400/10 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-400/20"
                onClick={() => {
                  setSelectedTags(prev => {
                    const next = new Set(prev);
                    next.delete(t);
                    return next;
                  });
                }}
                title={`#${t} filtresini kaldır`}
              >
                <span className="truncate max-w-[140px]">#{t}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="opacity-60 group-hover:opacity-100"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70 hidden sm:inline">{filteredItems.length} sonuç</span>
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-lg border text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => { setStarBuckets(new Set()); setSelectedTags(new Set()); }}
              title="Tüm filtreleri temizle"
            >
              Temizle
            </button>
          </div>
        </div>
      )}

          

          {/* KART IZGARASI */}
          <h1 className="text-lg font-semibold mb-2">
            {order === 'new' ? 'En yeni' : 'En yüksek puan'}
          </h1>
          {loading && (
            <div className="flex items-center justify-center min-h-[50vh]" aria-live="polite" aria-busy="true">
              <Lottie
                animationData={starLoaderAnim}
                loop
                autoplay
                lottieRef={loaderRef}
                className="w-32 h-32"
              />
            </div>
          )}

          {/* Liste: Mobilde tek sütun (gerçek sıra korunur), md+ iki bağımsız sütun */}

          {/* MOBILE & TABLET: tek sütun — itemsWithAdd sırasını aynen uygula */}
          <div className="flex flex-col gap-5 lg:hidden">
            {itemsWithAdd.map((it: any, ix: number) =>
              it?.__add ? (
                <button
                  key={`add-m-${ix}`}
                  type="button"
                  onClick={() => {
                    setSharedItem(null);
                    setSharedId(null);
                    setShowQuickAdd(true);
                  }}
                  className="relative rounded-2xl border-2 border-emerald-300 p-4 shadow-sm bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40 flex flex-col items-center justify-center hover:-translate-y-0.5 hover:shadow-md transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[152px]"
                  aria-label="Yeni öğe ekle"
                  title="Yeni öğe ekle"
                >
                  <div className="grid place-items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <div className="text-4xl leading-none">+</div>
                    <div className="text-sm font-medium">Ekle</div>
                  </div>
                </button>
              ) : (
                <div
                  key={it.id}
                  ref={(el) => { itemRefs.current[it.id] = el; }}
                  className={highlightId === it.id ? 'rs-flash rounded-2xl' : ''}
                >
                  <ItemCard
                    item={it}
                    saved={savedIds.has(it.id)}
                    amAdmin={amAdmin}
                    myId={myId}
                    onVoteComment={voteOnComment}
                    onItemChanged={load}
                    openShareId={openShare?.scope === 'list' ? openShare.id : null}
                    setOpenShareId={(id) => setOpenShare(id ? { scope: 'list', id } : null)}
                    openMenuId={openMenu?.scope === 'list' ? openMenu.id : null}
                    setOpenMenuId={(id) => setOpenMenu(id ? { scope: 'list', id } : null)}
                    copiedShareId={copiedShareId}
                    onOpenSpotlight={openSpotlight}
                    onToggleSave={toggleSave}
                    onReport={report}
                    onDelete={deleteItem}
                    onCopyShare={handleCopyShare}
                    onNativeShare={nativeShare}
                    selectedTags={selectedTags}
                    onToggleTag={(t) => {
                      setSelectedTags(prev => {
                        const next = new Set(prev);
                        if (next.has(t)) next.delete(t); else next.add(t);
                        return next;
                      });
                    }}
                    onResetTags={() => setSelectedTags(new Set())}
                    onShowInList={showInList}
                  />
                </div>
              )
            )}
          </div>

          {/* DESKTOP: 2 sütun — bağımsız dikey akış, row‑major dağıtım */}
          <div className="hidden lg:grid grid-cols-2 gap-5">
            {/* Sol sütun */}
            <div className="flex flex-col gap-5">
              {colLeft.map((it: any, ix: number) => (
                it?.__add ? (
                  <button
                    key={`add-left-${ix}`}
                    type="button"
                    onClick={() => {
                      setSharedItem(null);
                      setSharedId(null);
                      setShowQuickAdd(true);
                    }}
                    className="relative rounded-2xl border-2 border-emerald-300 p-4 shadow-sm bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40 flex flex-col items-center justify-center hover:-translate-y-0.5 hover:shadow-md transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[152px]"
                    aria-label="Yeni öğe ekle"
                    title="Yeni öğe ekle"
                  >
                    <div className="grid place-items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <div className="text-4xl leading-none">+</div>
                      <div className="text-sm font-medium">Ekle</div>
                    </div>
                  </button>
                ) : (
                  <div
                    key={it.id}
                    ref={(el) => { itemRefs.current[it.id] = el; }}
                    className={highlightId === it.id ? 'rs-flash rounded-2xl' : ''}
                  >
                    <ItemCard
                      item={it}
                      saved={savedIds.has(it.id)}
                      amAdmin={amAdmin}
                      myId={myId}
                      onVoteComment={voteOnComment}
                      onItemChanged={load}
                      openShareId={openShare?.scope === 'list' ? openShare.id : null}
                      setOpenShareId={(id) => setOpenShare(id ? { scope: 'list', id } : null)}
                      openMenuId={openMenu?.scope === 'list' ? openMenu.id : null}
                      setOpenMenuId={(id) => setOpenMenu(id ? { scope: 'list', id } : null)}
                      copiedShareId={copiedShareId}
                      onOpenSpotlight={openSpotlight}
                      onToggleSave={toggleSave}
                      onReport={report}
                      onDelete={deleteItem}
                      onCopyShare={handleCopyShare}
                      onNativeShare={nativeShare}
                      selectedTags={selectedTags}
                      onToggleTag={(t) => {
                        setSelectedTags(prev => {
                          const next = new Set(prev);
                          if (next.has(t)) next.delete(t); else next.add(t);
                          return next;
                        });
                      }}
                      onResetTags={() => setSelectedTags(new Set())}
                      onShowInList={showInList}
                    />
                  </div>
                )
              ))}
            </div>
            {/* Sağ sütun */}
            <div className="flex flex-col gap-5">
              {colRight.map((it: any, ix: number) => (
                it?.__add ? (
                  <button
                    key={`add-right-${ix}`}
                    type="button"
                    onClick={() => {
                      setSharedItem(null);
                      setSharedId(null);
                      setShowQuickAdd(true);
                    }}
                    className="relative rounded-2xl border-2 border-emerald-300 p-4 shadow-sm bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40 flex flex-col items-center justify-center hover:-translate-y-0.5 hover:shadow-md transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[152px]"
                    aria-label="Yeni öğe ekle"
                    title="Yeni öğe ekle"
                  >
                    <div className="grid place-items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <div className="text-4xl leading-none">+</div>
                      <div className="text-sm font-medium">Ekle</div>
                    </div>
                  </button>
                ) : (
                  <div
                    key={it.id}
                    ref={(el) => { itemRefs.current[it.id] = el; }}
                    className={highlightId === it.id ? 'rs-flash rounded-2xl' : ''}
                  >
                    <ItemCard
                      item={it}
                      saved={savedIds.has(it.id)}
                      amAdmin={amAdmin}
                      myId={myId}
                      onVoteComment={voteOnComment}
                      onItemChanged={load}
                      openShareId={openShare?.scope === 'list' ? openShare.id : null}
                      setOpenShareId={(id) => setOpenShare(id ? { scope: 'list', id } : null)}
                      openMenuId={openMenu?.scope === 'list' ? openMenu.id : null}
                      setOpenMenuId={(id) => setOpenMenu(id ? { scope: 'list', id } : null)}
                      copiedShareId={copiedShareId}
                      onOpenSpotlight={openSpotlight}
                      onToggleSave={toggleSave}
                      onReport={report}
                      onDelete={deleteItem}
                      onCopyShare={handleCopyShare}
                      onNativeShare={nativeShare}
                      selectedTags={selectedTags}
                      onToggleTag={(t) => {
                        setSelectedTags(prev => {
                          const next = new Set(prev);
                          if (next.has(t)) next.delete(t); else next.add(t);
                          return next;
                        });
                      }}
                      onResetTags={() => setSelectedTags(new Set())}
                      onShowInList={showInList}
                    />
                  </div>
                )
              ))}
            </div>
          </div>
          {/* PAGER (bottom) */}
          <Pager page={page} totalPages={totalPages} onPageChange={goToPage} />

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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-sm font-medium">Rapor alındı</span>
              </div>
            </div>
          )}
          <ScrollToTop />
        </section>
      </main>
    
    </div>
  );
}