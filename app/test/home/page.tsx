'use client';

// --- PAYLAŞIM YARDIMCILARI ---
function buildShareUrl(id: string) {
  return `${window.location.origin}/share/${id}`;
}
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
  } catch { return false; }
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

import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import starLoaderAnim from '@/assets/animations/star-loader.json';

import Header from '@/components/header/Header';
import QuickAddHome from '@/components/home/QuickAddHome';
import SpotlightCard from '@/components/home/spotlight/SpotlightCard';
import ItemCard from '@/components/items/ItemCard';
import TrendingTagsCard from '@/components/home/TrendingTagsCard';
import AllTagsCard from '@/components/home/AllTagsCard';
import SortAndStarsCard from '@/components/home/SortAndStarsCard';
import ReportModal from '@/components/common/ReportModal';
import ScrollToTop from '@/components/common/ScrollToTop';

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
    id: string; name: string; maskedName?: string | null;
    avatarUrl?: string | null; verified?: boolean;
    kind?: "REGULAR" | "BRAND" | string | null;
  } | null;
  comments: {
    id: string; text: string; rating?: number | null; score?: number | null;
    myVote?: 1 | -1 | 0 | null; edited?: boolean;
    user?: { id?: string; name?: string | null; maskedName?: string | null;
      avatarUrl?: string | null; verified?: boolean; kind?: "REGULAR" | "BRAND" | string | null; };
    images?: { id?: string; url: string; width?: number; height?: number; blurDataUrl?: string; order?: number; }[];
  }[];
  tags: string[];
  reportCount?: number;
};

export default function HomePage() {
  // ------- Search / Suggestions -------
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

  // ------- Order / Data / Tags -------
  const [order, setOrder] = useState<'new' | 'top'>('new');
  const [items, setItems] = useState<ItemVM[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<LottieRefCurrentProps>(null);
  useEffect(() => { try { loaderRef.current?.setSpeed(1.8); } catch {} }, [loading]);

  // Saved, filters, stars
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [starBuckets, setStarBuckets] = useState<Set<number>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Menus / Share
  const [openMenu, setOpenMenu] = useState<{ scope: 'list' | 'spot'; id: string } | null>(null);
  const [openShare, setOpenShare] = useState<{ scope: 'list' | 'spot'; id: string } | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const handleCopyShare = async (id: string) => {
    const ok = await copyShareLink(id);
    if (ok) { setCopiedShareId(id); setTimeout(() => setCopiedShareId(null), 1600); }
  };
  useEffect(() => { if (!openShare) setCopiedShareId(null); }, [openShare]);

  // Quick Add
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  // Spotlight (shared item & comment)
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [sharedItem, setSharedItem] = useState<ItemVM | null>(null);
  const [sharedCommentId, setSharedCommentId] = useState<string | null>(null);

  // Comment edit / votes
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [truncatedComments, setTruncatedComments] = useState<Set<string>>(new Set());
  const commentTextRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [editingCommentId, setEditingCommentId] = useState<string|null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingCommentItem, setEditingCommentItem] = useState<string|null>(null);
  const [editingCommentRating, setEditingCommentRating] = useState<number>(0);

  // Report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const REPORT_PRESETS = ['Spam','Nefret söylemi','Şiddet / Tehdit','Uygunsuz içerik','Kişisel veri','Taciz','Spoiler','Yanlış bilgi','Telif ihlali','Diğer'] as const;
  const [reportPreset, setReportPreset] = useState<(typeof REPORT_PRESETS)[number] | ''>('');
  const [reportDetails, setReportDetails] = useState(''); 
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Session & roles
  const { data: session } = useSession();
  const myId = (session as any)?.user?.id ?? null;
  const amAdmin = Boolean((session as any)?.user?.isAdmin) || ((session as any)?.user?.email === ADMIN_EMAIL);
  const isBrandUser = ((session as any)?.user?.kind ?? '').toUpperCase?.() === 'BRAND';

  // Anim / spotlight helpers (← →)
  const [navDir, setNavDir] = useState<0 | 1 | -1>(0);
  const [animKey, setAnimKey] = useState(0);
  const [animArmed, setAnimArmed] = useState(false);
  const firstAnimDoneRef = useRef<{[k in -1 | 1]: boolean}>({ [-1]: false, [1]: false });
  const spotlightRef = useRef<HTMLDivElement>(null);
  const pendingSpotlightScrollRef = useRef(false);

  // Utility: robust array plucker
  function toArray(v: any, ...keys: string[]) {
    const COMMON = ['items', 'data', 'results', 'rows', ...keys];
    function deepFind(obj: any, seen = new Set<any>()): any[] {
      if (!obj) return []; if (Array.isArray(obj)) return obj; if (typeof obj !== 'object') return [];
      for (const k of COMMON) {
        const val = (obj as any)[k];
        if (Array.isArray(val)) return val;
        if (val && typeof val === 'object' && !seen.has(val)) { seen.add(val); const arr = deepFind(val, seen); if (arr.length) return arr; }
      }
      for (const val of Object.values(obj)) {
        if (Array.isArray(val)) return val;
        if (val && typeof val === 'object' && !seen.has(val)) { seen.add(val); const arr = deepFind(val, seen); if (arr.length) return arr; }
      }
      return [];
    }
    if (Array.isArray(v)) return v;
    return deepFind(v);
  }

  // Loading
  async function loadSavedIds() {
    try {
      const r = await fetch('/api/items/saved-ids', { cache: 'no-store' });
      if (!r.ok) { setSavedIds(new Set()); return; }
      const j = await r.json().catch(() => null);
      const ids: string[] = Array.isArray(j?.ids) ? j.ids : [];
      setSavedIds(new Set(ids));
    } catch { setSavedIds(new Set()); }
  }
  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (qCommitted.trim()) qs.set('q', qCommitted.trim());
      qs.set('order', order);
      async function fetchItemsRes(url: string, fallbackUrl: string) {
        try {
          const r1 = await fetch(url, { cache: 'no-store' }); let j1:any=null; try{ j1=await r1.json(); }catch{}
          const arr1 = toArray(j1, 'items','data'); if (Array.isArray(arr1) && arr1.length>0) return j1 ?? {};
        } catch {}
        try {
          const r2 = await fetch(fallbackUrl, { cache: 'no-store' }); let j2:any=null; try{ j2=await r2.json(); }catch{}
          return j2 ?? {};
        } catch { return {}; }
      }
      const [itemsRes, tagsRes, trendRes] = await Promise.all([
        (qCommitted.trim().length > 0
          ? fetch(`/api/items?${qs.toString()}`, { cache: 'no-store' }).then(r=>r.json()).catch(()=>({}))
          : fetchItemsRes(`/api/items?${qs.toString()}`, '/api/items')),
        fetch('/api/tags', { cache: 'no-store' }).then(r=>r.json()).catch(()=>({})),
        fetch('/api/tags/trending', { cache: 'no-store' }).then(r=>r.json()).catch(()=>({})),
      ]);
      setItems(toArray(itemsRes,'items','data') ?? []);
      setAllTags(toArray(tagsRes,'tags','data') ?? []);
      setTrending(toArray(trendRes,'tags','trending','data') ?? []);
    } finally { setLoading(false); }
  }

  // Mount
  useEffect(() => { load(); loadSavedIds(); }, []);
  useEffect(() => {
    try {
      (window as any).ratestuff = {
        load, reload: load,
        closeQuickAdd: () => setShowQuickAdd(false),
        refreshAndCloseQuickAdd: () => { setShowQuickAdd(false); load(); },
      };
    } catch {}
    return () => { try { delete (window as any).ratestuff; } catch {} };
  }, [load]);

  // External reload
  useEffect(() => {
    function onExternalReload() {
      try {
        setShowQuickAdd(false); setSharedItem(null); setSharedId(null);
        setSelectedTags(new Set()); setStarBuckets(new Set());
        setOrder('new'); setQInput(''); setQCommitted('');
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
      } catch {}
      load();
    }
    window.addEventListener('ratestuff:items:reload', onExternalReload as any);
    return () => window.removeEventListener('ratestuff:items:reload', onExternalReload as any);
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null; if (!target) return;
      if (target.closest('.rs-pop')) return; setOpenMenu(null); setOpenShare(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Spotlight URL parse (+ legacy /share/:id normalize)
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const m = u.pathname.match(/^\/share\/([^/?#]+)/);
      if (m && m[1]) {
        const legacyId = m[1]; setSharedId(legacyId);
        u.pathname = '/'; u.searchParams.set('item', legacyId);
        window.history.replaceState({}, '', u.toString());
      } else {
        const id = u.searchParams.get('item'); setSharedId(id);
      }
      const c = u.searchParams.get('comment'); setSharedCommentId(c);
    } catch {}
  }, []);

  // Spotlight fetch by id
  async function refreshShared(id: string) {
    try {
      const r = await fetch(`/api/items?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const j = await r.json().catch(() => null);
      const arr = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : (j?.item ? [j.item] : []));
      setSharedItem(arr[0] || null);
    } catch {}
  }
  useEffect(() => {
    let aborted = false;
    async function run() {
      if (!sharedId) { setSharedItem(null); return; }
      try {
        const r = await fetch(`/api/items?id=${encodeURIComponent(sharedId)}`, { cache: 'no-store' });
        const j = await r.json().catch(() => null);
        const arr = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : (j?.item ? [j.item] : []));
        if (!aborted) setSharedItem(arr[0] || null);
        try {
          const u = new URL(window.location.href);
          setSharedCommentId(u.searchParams.get('comment'));
        } catch {}
      } catch { if (!aborted) setSharedItem(null); }
    }
    run(); return () => { aborted = true; };
  }, [sharedId]);

  // Search suggestions (debounced)
  useEffect(() => {
    let aborted = false;
    const typed = qInput.trim();
    if (!typed || typed === qCommitted) { setSuggestions([]); return; }
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/items?q=${encodeURIComponent(typed)}&limit=10`, { cache: 'no-store' });
        const j = await r.json().catch(() => null);
        const arr = toArray(j, 'items','data');
        const names: string[] = Array.isArray(arr)
          ? Array.from(new Set(arr.map((x:any) => String(x?.name || '').trim()).filter(Boolean)))
          : [];
        if (!aborted) setSuggestions(names.slice(0, 10));
      } catch { if (!aborted) setSuggestions([]); }
    }, 150);
    return () => { aborted = true; clearTimeout(id); };
  }, [qInput, qCommitted]);

  // Reload on committed search or order
  useEffect(() => { load(); }, [qCommitted, order]);

  // Delete / preview logic: if clearing input, reset committed
  const deleting = qCommitted.length>0 && qCommitted.startsWith(qInput) && qInput.length < qCommitted.length;
  useEffect(() => {
    if (!qCommitted) return;
    const cleared = qInput.trim().length === 0;
    const startedDeleting = qCommitted.length>0 && qCommitted.startsWith(qInput) && qInput.length < qCommitted.length;
    if (cleared || startedDeleting) { setQCommitted(''); setSuggestions([]); }
  }, [qInput, qCommitted]);

  // Filters: bucket + tags
  function bucketOf(avg: number | null): number | null {
    if (!avg || avg <= 0) return null; return Math.ceil(avg);
  }
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (starBuckets.size > 0) {
      filtered = filtered.filter(i => { const b = bucketOf(i.avg); return b !== null && starBuckets.has(b); });
    }
    if (selectedTags.size > 0) {
      filtered = filtered.filter(i => Array.from(selectedTags).every(tag => i.tags.includes(tag)));
    }
    if (order === 'top') {
      filtered = [...filtered].sort((a,b) => {
        const ar = (a.avgRating ?? a.avg ?? 0), br = (b.avgRating ?? b.avg ?? 0);
        if (br !== ar) return br - ar;
        const ac = (a.count ?? 0), bc = (b.count ?? 0);
        if (bc !== ac) return bc - ac;
        return 0;
      });
    }
    return filtered;
  }, [items, starBuckets, selectedTags, order]);

  // Spotlight navigation
  const currentIndex = useMemo(
    () => (sharedItem ? filteredItems.findIndex(i => i.id === sharedItem.id) : -1),
    [sharedItem, filteredItems]
  );
  function openSpotlight(id: string, fromDelta: boolean = false) {
    setShowQuickAdd(false);
    if (!fromDelta) setNavDir(0);
    setSharedId(id);
    try {
      const url = new URL(window.location.href);
      url.pathname = '/';
      url.searchParams.set('item', id);
      if (url.searchParams.has('comment')) url.searchParams.delete('comment');
      window.history.replaceState({}, '', url.toString());
    } catch {}
    if (!fromDelta) { pendingSpotlightScrollRef.current = true; }
  }
  function closeSpotlight() {
    setSharedItem(null); setSharedId(null);
    try {
      const url = new URL(window.location.href);
      url.pathname = '/'; url.searchParams.delete('item'); url.searchParams.delete('comment');
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }
  function openByIndex(idx: number, fromDelta=false) {
    if (idx < 0 || idx >= filteredItems.length) return;
    openSpotlight(filteredItems[idx].id, fromDelta);
  }
  function openByDelta(d: number) {
    if (currentIndex < 0) return;
    const next = currentIndex + d; if (next < 0 || next >= filteredItems.length) return;
    setAnimArmed(false);
    requestAnimationFrame(() => setAnimArmed(false));
    setNavDir(d > 0 ? 1 : -1);
    openByIndex(next, true);
  }
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

  useEffect(() => {
    const el = spotlightRef.current;
    if (!el || !sharedItem) return;
    let x0=0, y0=0, t0=0;
    function onStart(e: TouchEvent) {
      const t = e.touches[0]; if (!t) return; x0=t.clientX; y0=t.clientY; t0=Date.now();
    }
    function onEnd(e: TouchEvent) {
      const t = e.changedTouches[0]; if (!t) return;
      const dx=t.clientX-x0, dy=t.clientY-y0, dt=Date.now()-t0;
      if (Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy) && dt<600) { if (dx<0) openByDelta(1); else openByDelta(-1); }
    }
    el.addEventListener('touchstart', onStart as any, { passive: true } as any);
    el.addEventListener('touchend', onEnd as any, { passive: true } as any);
    return () => { el.removeEventListener('touchstart', onStart as any); el.removeEventListener('touchend', onEnd as any); };
  }, [spotlightRef, sharedItem, currentIndex, filteredItems.length]);

  useEffect(() => {
    if (navDir !== 0 && sharedItem?.id) {
      setAnimKey(k => k + 1);
      const already = firstAnimDoneRef.current[navDir];
      if (!already) {
        const id = requestAnimationFrame(() => setAnimArmed(true));
        firstAnimDoneRef.current[navDir] = true;
        return () => cancelAnimationFrame(id);
      } else { setAnimArmed(true); }
    }
  }, [sharedItem?.id, navDir]);

  // Spotlight: comment highlight (from ?comment=)
  function highlightCommentInline(commentId: string) {
    const sel = `[data-comment-id="${CSS.escape(commentId)}"]`;
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return false;
    el.classList.add('rs-comment-highlight');
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { el.scrollIntoView({ block: 'center' }); }
    window.setTimeout(() => el.classList.remove('rs-comment-highlight'), 2400);
    return true;
  }
  useEffect(() => {
    if (!sharedItem || !sharedCommentId) return;
    let cancelled = false;
    if (highlightCommentInline(sharedCommentId)) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (cancelled) return;
      if (highlightCommentInline(sharedCommentId)) { window.clearInterval(timer); return; }
      if (Date.now() - started > 5000) window.clearInterval(timer);
    }, 150);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [sharedItem, sharedCommentId]);

  // Spotlight mount scroll
  function headerOffset() {
    try {
      const header = document.querySelector('header');
      if (header) {
        const h = Math.round(header.getBoundingClientRect().height);
        return Math.max(48, Math.min(120, h + 8));
      }
    } catch {}
    const w = window.innerWidth || 0;
    return w < 640 ? 64 : 96;
  }
  function smoothScrollToY(y: number) { try { window.scrollTo({ top: y, behavior: 'smooth' }); } catch { window.scrollTo(0, y); } }
  function smoothScrollIntoView(el: Element) { const rect = el.getBoundingClientRect(); const y = rect.top + window.scrollY - headerOffset(); smoothScrollToY(y); }
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

  // Comment truncation measurement
  function measureTruncation(id: string) {
    const el = commentTextRefs.current[id];
    if (!el) return;
    const over = el.scrollWidth > el.clientWidth;
    setTruncatedComments((prev) => { const next = new Set(prev); if (over) next.add(id); else next.delete(id); return next; });
  }
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
  const tagMatches = useMemo(() => {
    const s = qInput.trim().toLowerCase();
    if (!s) return [] as string[];
    const pool = Array.from(new Set([...(trending || []), ...(allTags || [])]));
    return pool.filter(t => t.toLowerCase().includes(s)).slice(0, 12);
  }, [qInput, allTags, trending]);
  useEffect(() => { // reload when header controls change
    const detail = {
      q: qInput, onQ: handleOnQ, order, onOrder: setOrder,
      starBuckets: Array.from(starBuckets),
      onStarBuckets: (arr: number[]) => setStarBuckets(new Set(arr)),
      onCommit: handleOnCommit, onSearch: handleOnCommit,
      suggestions,
      onClickSuggestion: (s: string) => { handleOnQ(s); handleOnCommit(s); },
      tagMatches,
      onClickTagMatch: (t: string) => {
        if (!t) return;
        setSelectedTags(prev => { const next = new Set(prev); next.add(t); return next; });
        setQCommitted(qInput); setShowQuickAdd(false); setSharedItem(null); setSharedId(null);
      },
      showSuggestions: qInput !== qCommitted,
    };
    window.dispatchEvent(new CustomEvent('rs:setHeaderControls', { detail }));
  }, [qInput, qCommitted, order, starBuckets, suggestions, tagMatches, handleOnQ, handleOnCommit]);

  // Actions (save / rate / comment / report)
  async function toggleSave(id: string) {
    const wasSaved = savedIds.has(id);
    setSavedIds(prev => { const next = new Set(prev); if (wasSaved) next.delete(id); else next.add(id); return next; });
    const method = wasSaved ? 'DELETE' : 'POST';
    const res = await fetchOrSignin(`/api/items/${id}/save`, { method });
    if (!res) { // rollback
      setSavedIds(prev => { const next = new Set(prev); if (wasSaved) next.add(id); else next.delete(id); return next; });
      return;
    }
    const j = await res.json().catch(() => null);
    if (!j?.ok) {
      setSavedIds(prev => { const next = new Set(prev); if (wasSaved) next.add(id); else next.delete(id); return next; });
      alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
      return;
    }
    setOpenMenu(null); await loadSavedIds();
  }
  async function rate(id: string, value: number) {
    const res = await fetchOrSignin(`/api/items/${id}/rate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value })
    });
    if (!res) return; const j = await res.json().catch(() => null);
    if (j?.ok) await load(); else alert('Hata: ' + (j?.error || res.status));
  }
  async function sendComment(itemId: string, text: string) {
    if (!text.trim()) return;
    const res = await fetchOrSignin(`/api/items/${itemId}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.trim() })
    });
    if (!res) return; const j = await res.json().catch(() => null);
    if (j?.ok) { await load(); if (sharedId && itemId === sharedId) await refreshShared(itemId); }
    else alert('Hata: ' + (j?.error || res.status));
  }
  async function deleteComment(commentId: string) {
    let res = await fetchOrSignin(`/api/comments/${commentId}`, { method: 'DELETE' });
    if (!res) return;
    if (res.status === 405 || res.status === 404) {
      res = await fetchOrSignin(`/api/comment/${commentId}`, { method: 'DELETE' });
      if (!res) return;
    }
    let j:any=null; try { j = await res.json(); } catch {}
    if (res.ok && (j?.ok ?? true)) { await load(); if (sharedId) await refreshShared(sharedId); }
    else alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
  }
  async function voteOnComment(commentId: string, nextValue: 1 | -1 | 0) {
    const res = await fetchOrSignin(`/api/comments/${commentId}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: nextValue })
    });
    if (!res) return; const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) { alert('Hata: ' + (j?.error || res.status)); return; }
    await load(); if (sharedId) await refreshShared(sharedId);
  }
  async function updateComment(commentId: string, text: string, itemId?: string, rating?: number) {
    let res = await fetchOrSignin(`/api/comments/${commentId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, rating })
    });
    if (res && res.ok) { await load(); if (sharedId) await refreshShared(sharedId); return true; }
    if (itemId) {
      res = await fetchOrSignin(`/api/items/${itemId}/comments`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commentId, text, rating })
      });
      if (res && res.ok) { await load(); if (sharedId) await refreshShared(sharedId); return true; }
    }
    const j = res ? (await res.json().catch(()=>null)) : null;
    alert('Hata: ' + (j?.error || (res ? `${res.status} ${res.statusText}` : 'yorum güncellenemedi'))); return false;
  }
  async function report(id: string) {
    setReportTargetId(id); setReportPreset(''); setReportDetails(''); setReportError(null); setReportOpen(true);
  }
  async function submitReport() {
    if (!reportTargetId) return;
    const preset = String(reportPreset || '').trim();
    const details = String(reportDetails || '').trim();
    if (!preset) { setReportError('Lütfen bir sebep seç.'); return; }
    if (preset === 'Diğer' && !details) { setReportError('Diğer seçildi, lütfen sebebi yaz.'); return; }
    const finalReason = preset === 'Diğer' ? details : (details ? `${preset} — ${details}` : preset);
    setReportSubmitting(true); setReportError(null);
    const res = await fetchOrSignin(`/api/items/${reportTargetId}/report`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: finalReason })
    });
    setReportSubmitting(false); if (!res) return;
    let j:any=null; try { j = await res.json(); } catch {}
    if (res.ok && j?.ok) {
      setReportOpen(false); setReportTargetId(null); setReportPreset(''); setReportDetails('');
      setReportSuccess(true); setTimeout(() => setReportSuccess(false), 1600);
      if (sharedId) { try { await refreshShared(sharedId); } catch {} }
    } else { setReportError(j?.error || `${res.status} ${res.statusText}`); }
  }

  // Add item
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res) return false;
      let j:any=null; try { j = await res.json(); } catch {}
      const httpOk = res.ok; const okFlag = typeof j?.ok === 'boolean' ? j.ok : undefined;
      const success = httpOk && (okFlag !== false);
      if (success) { setQInput(''); setQCommitted(''); await load(); return { ok: true }; }
      const err = String(j?.error || '');
      const isDuplicate = res.status===409 || /P2002/.test(err) || /Unique constraint/i.test(err) || (/unique/i.test(err) && /name/i.test(err));
      if (isDuplicate) { return { ok: false, duplicate: true, error: 'Bu adla zaten bir öğe var.' }; }
      return { ok: false, error: err || `${res.status} ${res.statusText}` };
    } finally { setAdding(false); }
  }

  // “Show in list” (scroll to row card)
  function showInList(id: string) {
    try {
      setOpenMenu(null); setOpenShare(null);
      // Karte scroll: o kartın bulunduğu satırı bulup ona kaydırırız
      const el = document.querySelector<HTMLElement>(`[data-itemcard-id="${CSS.escape(id)}"]`);
      if (!el) return;
      el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      el.classList.add('rs-flash'); setTimeout(() => el.classList.remove('rs-flash'), 1600);
    } catch {}
  }

  // --- Netflix tarzı satır/row üretimi ---
  // 1) “Yeni” satırı: current filtered order='new' list
  const rowNew = filteredItems.slice(0, 12);
  // 2) “En Yüksek Puanlılar”
  const rowTop = useMemo(() => {
    const byTop = [...filteredItems].sort((a,b) => {
      const ar = (a.avgRating ?? a.avg ?? 0), br = (b.avgRating ?? b.avg ?? 0);
      if (br !== ar) return br - ar;
      const ac = (a.count ?? 0), bc = (b.count ?? 0);
      if (bc !== ac) return bc - ac;
      return 0;
    });
    return byTop.slice(0, 12);
  }, [filteredItems]);
  // 3) Trend tag’lerine göre satırlar (ilk 6 tag)
  const trendRows = useMemo(() => {
    const takeTags = (trending || []).slice(0, 6);
    return takeTags.map(tag => ({
      tag,
      items: filteredItems.filter(i => i.tags.includes(tag)).slice(0, 12)
    })).filter(r => r.items.length > 0);
  }, [trending, filteredItems]);

  // Scrollable row refs & handlers
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  function scrollRow(id: string, dir: -1 | 1) {
    const el = rowRefs.current[id]; if (!el) return;
    const w = el.clientWidth; el.scrollBy({ left: dir * Math.max(280, Math.floor(w * 0.9)), behavior: 'smooth' });
  }

  // SEO JSON-LD + canonical
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ratestuff.net").replace(/\/+$/, "");
  const canonicalShareUrl = sharedId ? `${base}/share/${sharedId}` : null;
  const websiteLD = {
    "@context": "https://schema.org", "@type": "WebSite", name: "RateStuff", url: base,
    potentialAction: { "@type": "SearchAction", target: `${base}/search?q={search_term_string}`, "query-input": "required name=search_term_string" }
  };
  const orgLD = { "@context": "https://schema.org", "@type": "Organization", name: "RateStuff", url: base, logo: `${base}/logo.svg` };
  const itemLD = sharedItem ? {
    "@context": "https://schema.org", "@type": "CreativeWork",
    name: sharedItem.name || "RateStuff içeriği",
    description: sharedItem.description || undefined,
    url: canonicalShareUrl || undefined, mainEntityOfPage: canonicalShareUrl || undefined,
    image: sharedItem.imageUrl || undefined,
    ...(typeof (sharedItem.avg ?? sharedItem.avgRating) === 'number' && (sharedItem.count ?? 0) > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(((sharedItem.avg ?? sharedItem.avgRating) as number).toFixed(2)), ratingCount: sharedItem.count ?? undefined } }
      : {}),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {canonicalShareUrl && (
        <Head><link rel="canonical" href={canonicalShareUrl} /></Head>
      )}
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLD) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLD) }} />
        {itemLD && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemLD) }} />}
      </Head>

      <style jsx global>{`
        /* Animations */
        @keyframes slideInFromLeft { 0% { opacity: 0; transform: translate3d(-10px,0,0); } 100% { opacity: 1; transform: translate3d(0,0,0); } }
        @keyframes slideInFromRight{ 0% { opacity: 0; transform: translate3d(10px,0,0); } 100% { opacity: 1; transform: translate3d(0,0,0); } }
        .animate-slideInFromLeft { animation: slideInFromLeft .14s cubic-bezier(0.22,1,0.36,1); will-change: transform; }
        .animate-slideInFromRight{ animation: slideInFromRight .14s cubic-bezier(0.22,1,0.36,1); will-change: transform; }
        @media (prefers-reduced-motion: reduce){ .animate-slideInFromLeft,.animate-slideInFromRight{ animation-duration:.01ms; animation-iteration-count:1; } }

        /* Comment highlight */
        .rs-comment-highlight {
          outline: 2px solid rgb(16 185 129 / 0.95);
          outline-offset: 0; border-radius: 12px;
          box-shadow: 0 0 0 10px rgb(16 185 129 / 0.16);
          animation: rsCmtPulse 140ms cubic-bezier(0.22,1,0.36,1) 0s 1, rsCmtGlow 2200ms ease-out 0s 1 forwards;
          will-change: transform, outline-color, box-shadow, opacity;
        }
        @keyframes rsCmtPulse { 0%{transform:scale(1);} 50%{transform:scale(1.01);} 100%{transform:scale(1);} }
        @keyframes rsCmtGlow {
          0%{ outline-color: rgb(16 185 129 / 0.95); box-shadow: 0 0 0 10px rgb(16 185 129 / 0.16);}
          70%{ outline-color: rgb(16 185 129 / 0.50); box-shadow: 0 0 0 6px rgb(16 185 129 / 0.08);}
          100%{ outline-color: rgb(16 185 129 / 0.00); box-shadow: 0 0 0 0 rgb(16 185 129 / 0.00);}
        }

        /* Flash for "show in list" */
        .rs-flash { outline: 2px solid rgb(16 185 129 / 0.9); outline-offset: 2px; border-radius: 16px; }

        /* Row scroller (Netflix-like) */
        .rs-row {
          overflow-x: auto; overflow-y: clip; -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory; scroll-padding: 0 16px;
          scrollbar-width: none; /* Firefox */
        }
        .rs-row::-webkit-scrollbar { display: none; }
        .rs-card { scroll-snap-align: start; }

        /* Gradient edge masks for row */
        .rs-mask-l::before, .rs-mask-r::after {
          content: ""; position: absolute; top: 0; bottom: 0; width: 52px; pointer-events: none;
        }
        .rs-mask-l::before { left: 0; background: linear-gradient(to right, rgba(249,250,251,.9), rgba(249,250,251,0)); }
        .rs-mask-r::after  { right: 0; background: linear-gradient(to left, rgba(249,250,251,.9), rgba(249,250,251,0)); }
        .dark .rs-mask-l::before { background: linear-gradient(to right, rgba(17,24,39,.9), rgba(17,24,39,0)); }
        .dark .rs-mask-r::after  { background: linear-gradient(to left, rgba(17,24,39,.9), rgba(17,24,39,0)); }

        /* Row nav buttons */
        .rs-nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 40px; height: 40px; border-radius: 9999px; display: grid; place-items: center;
          background: rgba(0,0,0,.06); backdrop-filter: saturate(1.2) blur(4px);
        }
        .rs-nav:hover { background: rgba(0,0,0,.12); }
        .dark .rs-nav { background: rgba(255,255,255,.06); }
        .dark .rs-nav:hover { background: rgba(255,255,255,.12); }
      `}</style>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Spotlight (tek öğe) */}
        {!showQuickAdd && sharedItem && (
          <div ref={spotlightRef}>
            <SpotlightCard
              item={sharedItem}
              amAdmin={amAdmin}
              myId={myId}
              saved={savedIds.has(sharedItem.id)}
              openShareId={openShare?.scope === 'spot' ? openShare.id : null}
              setOpenShareId={(id) => setOpenShare(id ? { scope: 'spot', id } : null)}
              openMenuId={openMenu?.scope === 'spot' ? openMenu.id : null}
              setOpenMenuId={(id) => setOpenMenu(id ? { scope: 'spot', id } : null)}
              copiedShareId={copiedShareId}
              onClose={closeSpotlight}
              onDelete={async (id) => {
                const res = await fetchOrSignin(`/api/items/${id}`, { method: 'DELETE' });
                if (!res) return;
                const j = await res.json().catch(()=>null);
                if (res.ok && (j?.ok ?? true)) await load();
                else alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
              }}
              onToggleSave={toggleSave}
              onReport={report}
              onShowInList={showInList}
              onCopyShare={handleCopyShare}
              onNativeShare={nativeShare}
              index={currentIndex}
              count={filteredItems.length}
              onPrev={() => openByDelta(-1)}
              onNext={() => openByDelta(1)}
              animKey={animKey}
              animClass={
                navDir === -1 ? (animArmed ? 'animate-slideInFromLeft' : '')
                : navDir === 1 ? (animArmed ? 'animate-slideInFromRight' : '')
                : ''
              }
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
              showCount={7}
              setShowCount={() => {}}
              onCommentDone={async () => { await load(); await refreshShared(sharedItem.id); }}
            />
          </div>
        )}

        {/* Mobil filtre paneli (üstte kısa) */}
        <div className="md:hidden space-y-4">
          <TrendingTagsCard
            tags={trending}
            selected={selectedTags}
            onToggle={(t) => {
              setSelectedTags(prev => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; });
            }}
            onClearAll={() => setSelectedTags(new Set())}
            defaultOpen={true}
          />
          <AllTagsCard
            tags={allTags}
            trending={trending}
            selected={selectedTags}
            onToggle={(t) => {
              setSelectedTags(prev => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; });
            }}
            onClearAll={() => setSelectedTags(new Set())}
            defaultOpen={false}
          />
          <SortAndStarsCard
            order={order}
            onOrder={setOrder}
            starBuckets={starBuckets}
            onToggleStar={(n) => {
              setStarBuckets(prev => { const next = new Set(prev); if (next.has(n)) next.delete(n); else next.add(n); return next; });
            }}
            onClearStars={() => { setStarBuckets(new Set()); setQInput(''); setQCommitted(''); }}
            compact={true}
            className="mt-2"
          />
        </div>

        {/* Quick Add */}
        {showQuickAdd && (
          <QuickAddHome
            open
            variant="rich"
            signedIn={!!session}
            signInHref="/signin"
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
              fd.set('name', name); fd.set('desc', desc);
              fd.set('tags', tags.join(',')); fd.set('rating', String(rating));
              fd.set('comment', comment); fd.set('imageUrl', imageUrl ?? ''); fd.set('productUrl', productUrl ?? '');
              return await addItem(fd);
            }}
          />
        )}

        {/* Desktop filtre sütunu + içerik (iki kolonlu kısa üst bölüm) */}
        <section className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside className="hidden md:block">
            <TrendingTagsCard
              tags={trending}
              selected={selectedTags}
              onToggle={(t) => {
                setSelectedTags(prev => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; });
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
                setSelectedTags(prev => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; });
              }}
              onClearAll={() => setSelectedTags(new Set())}
              defaultOpen={false}
            />
            <SortAndStarsCard
              order={order}
              onOrder={setOrder}
              starBuckets={starBuckets}
              onToggleStar={(n) => {
                setStarBuckets(prev => { const next = new Set(prev); if (next.has(n)) next.delete(n); else next.add(n); return next; });
              }}
              onClearStars={() => { setStarBuckets(new Set()); setQInput(''); setQCommitted(''); }}
              compact={false}
              className="mt-4"
            />
          </aside>

          {/* Content area: Rows */}
          <div className="space-y-6">
            {/* Row: Quick CTA */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-semibold">Keşfet</h1>
              <button
                type="button"
                onClick={() => { if (showQuickAdd) setShowQuickAdd(false); else { setSharedItem(null); setSharedId(null); setShowQuickAdd(true); } }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-200 hover:-translate-y-0.5 hover:shadow transition"
                title="Yeni öğe ekle"
              >
                <span className="text-lg leading-none">+</span>
                <span className="text-sm font-medium">Ekle</span>
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center min-h-[40vh]" aria-live="polite" aria-busy="true">
                <Lottie animationData={starLoaderAnim} loop autoplay lottieRef={loaderRef} className="w-28 h-28" />
              </div>
            )}

            {!loading && (
              <>
                {/* Row: Yeni */}
                {rowNew.length > 0 && (
                  <div className="relative rs-mask-l rs-mask-r">
                    <div className="flex items-baseline justify-between mb-3">
                      <h2 className="text-lg font-semibold">En Yeni</h2>
                      <div className="flex items-center gap-2">
                        <button className="rs-nav" onClick={() => scrollRow('row-new', -1)} aria-label="Geri">
                          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                        </button>
                        <button className="rs-nav" onClick={() => scrollRow('row-new', 1)} aria-label="İleri">
                          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                    <div
                      ref={(el) => { rowRefs.current['row-new'] = el; }}
                      className="rs-row relative flex flex-row flex-nowrap gap-4"
                    >
                      {/* Add card */}
                      <button
                        type="button"
                        onClick={() => { if (showQuickAdd) setShowQuickAdd(false); else { setSharedItem(null); setSharedId(null); setShowQuickAdd(true); } }}
                        className="rs-card relative rounded-2xl border-2 border-emerald-300 p-4 shadow-sm bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-900/40 grid place-items-center hover:-translate-y-0.5 hover:shadow transition min-h-[152px] flex-none w-[320px] sm:w-[340px] md:w-[360px]"
                        aria-label="Yeni öğe ekle"
                        title="Yeni öğe ekle"
                      >
                        <div className="grid place-items-center gap-1 text-emerald-700 dark:text-emerald-300">
                          <div className="text-4xl leading-none">+</div>
                          <div className="text-sm font-medium">Ekle</div>
                        </div>
                      </button>
                      {rowNew.map((it) => (
                        <div key={it.id} className="rs-card flex-none w-[320px] sm:w-[340px] md:w-[360px]" data-itemcard-id={it.id}>
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
                            onDelete={async (id) => {
                              const res = await fetchOrSignin(`/api/items/${id}`, { method: 'DELETE' });
                              if (!res) return; const j = await res.json().catch(()=>null);
                              if (res.ok && (j?.ok ?? true)) await load(); else alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
                            }}
                            selectedTags={selectedTags}
                            onToggleTag={(t) => {
                              setSelectedTags(prev => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; });
                            }}
                            onResetTags={() => setSelectedTags(new Set())}
                            onShowInList={showInList}
                            onCopyShare={handleCopyShare}
                            onNativeShare={nativeShare}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row: En Yüksek Puanlılar */}
                {rowTop.length > 0 && (
                  <div className="relative rs-mask-l rs-mask-r">
                    <div className="flex items-baseline justify-between mb-3">
                      <h2 className="text-lg font-semibold">En Yüksek Puanlılar</h2>
                      <div className="flex items-center gap-2">
                        <button className="rs-nav" onClick={() => scrollRow('row-top', -1)} aria-label="Geri">
                          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                        </button>
                        <button className="rs-nav" onClick={() => scrollRow('row-top', 1)} aria-label="İleri">
                          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                    <div
                      ref={(el) => { rowRefs.current['row-top'] = el; }}
                      className="rs-row relative flex flex-row flex-nowrap gap-4"
                    >
                      {rowTop.map((it) => (
                        <div key={it.id} className="rs-card flex-none w-[320px] sm:w-[340px] md:w-[360px]" data-itemcard-id={it.id}>
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
                            onDelete={async (id) => {
                              const res = await fetchOrSignin(`/api/items/${id}`, { method: 'DELETE' });
                              if (!res) return; const j = await res.json().catch(()=>null);
                              if (res.ok && (j?.ok ?? true)) await load(); else alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
                            }}
                            selectedTags={selectedTags}
                            onToggleTag={(t) => {
                              setSelectedTags(prev => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; });
                            }}
                            onResetTags={() => setSelectedTags(new Set())}
                            onShowInList={showInList}
                            onCopyShare={handleCopyShare}
                            onNativeShare={nativeShare}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rows: Trend tag’leri */}
                {trendRows.map(({ tag, items: row }) => (
                  <div key={`row-${tag}`} className="relative rs-mask-l rs-mask-r">
                    <div className="flex items-baseline justify-between mb-3">
                      <h2 className="text-lg font-semibold">#{tag}</h2>
                      <div className="flex items-center gap-2">
                        <button className="rs-nav" onClick={() => scrollRow(`row-${tag}`, -1)} aria-label="Geri">
                          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                        </button>
                        <button className="rs-nav" onClick={() => scrollRow(`row-${tag}`, 1)} aria-label="İleri">
                          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                    <div
                      ref={(el) => { rowRefs.current[`row-${tag}`] = el; }}
                      className="rs-row relative flex flex-row flex-nowrap gap-4"
                    >
                      {row.map((it) => (
                        <div key={it.id} className="rs-card flex-none w-[320px] sm:w-[340px] md:w-[360px]" data-itemcard-id={it.id}>
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
                            onDelete={async (id) => {
                              const res = await fetchOrSignin(`/api/items/${id}`, { method: 'DELETE' });
                              if (!res) return; const j = await res.json().catch(()=>null);
                              if (res.ok && (j?.ok ?? true)) await load(); else alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
                            }}
                            selectedTags={selectedTags}
                            onToggleTag={(t) => {
                              setSelectedTags(prev => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; });
                            }}
                            onResetTags={() => setSelectedTags(new Set())}
                            onShowInList={showInList}
                            onCopyShare={handleCopyShare}
                            onNativeShare={nativeShare}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* Report modal + toast */}
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
      </main>
    </div>
  );
}