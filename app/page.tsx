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
      alert('Bağlantı kopyalandı');
    } else {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      alert('Bağlantı kopyalandı');
    }
  } catch {}
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
import SeoLD from "@/components/SeoLD";

import Head from 'next/head';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Tag from '@/components/Tag';
import Stars from '@/components/Stars';
import Header from '@/components/Header';
import CollapsibleSection from '@/components/CollapsibleSection';
import ImageUploader from '@/components/ImageUploader';
import CommentBox from '@/components/CommentBox';
import { useSession } from 'next-auth/react';
import { containsBannedWord } from '@/lib/bannedWords';
import RatingPill from '@/components/RatingPill';

const ADMIN_EMAIL = 'ratestuffnet@gmail.com';

// İsimleri maskelemek için (Ad Soyad -> A* S****)
// Not: Hiçbir özel anahtar kelime (anon, guest vs.) yok; dolu gelen her isim maskelenir.
function maskName(s?: string | null) {
  if (!s) return 'Anonim'; // yalnızca boş/gelmeyen için
  const raw = String(s).trim();
  if (!raw) return 'Anonim';

  const parts = raw.split(/\s+/).filter(Boolean);
  return parts
    .map((p) => {
      const first = p.charAt(0).toLocaleUpperCase('tr-TR');
      const restLen = Math.max(1, p.length - 1);
      return first + '*'.repeat(restLen);
    })
    .join(' ');
}

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
  avg: number | null;
  avgRating?: number | null;
  count: number;
  myRating?: number | null;
  edited?: boolean;
  createdBy?: { id: string; name: string; avatarUrl?: string | null; verified?: boolean } | null;
  comments: {
    id: string;
    text: string;
    rating?: number | null;
    score?: number | null;              // toplam oy (up - down)
    myVote?: 1 | -1 | 0 | null;         // kullanıcının mevcut oyu
    edited?: boolean;
    user?: { id?: string; name?: string | null; avatarUrl?: string | null; verified?: boolean };
  }[];
  tags: string[];
  reportCount?: number;
};


export default function HomePage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [qInput, setQInput] = useState('');
  const [qCommitted, setQCommitted] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [previewItems, setPreviewItems] = useState<ItemVM[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [order, setOrder] = useState<'new' | 'top'>('new');
  const [items, setItems] = useState<ItemVM[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  // Arama kutusundaki yazıya göre etiket eşleşmeleri (ilgili etiketler)
  const tagHits = useMemo(() => {
    const s = qInput.trim().toLowerCase();
    if (!s) return [] as string[];
    // trending + allTags birleşimi, mükerrerleri kaldır
    const pool = Array.from(new Set([...(trending || []), ...(allTags || [])]));
    return pool.filter(t => t.toLowerCase().includes(s)).slice(0, 12);
  }, [qInput, allTags, trending]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openShare, setOpenShare] = useState<string | null>(null);
  const [quickRating, setQuickRating] = useState(5);
  const [justAdded, setJustAdded] = useState(false);
  const [pulseQuick, setPulseQuick] = useState(false);
  const quickSectionRef = useRef<HTMLDivElement>(null);
  const quickNameRef = useRef<HTMLInputElement>(null);
  const [quickName, setQuickName] = useState('');
  const [quickTags, setQuickTags] = useState<string[]>([]);
  const [quickTagInput, setQuickTagInput] = useState('');
  const [quickComment, setQuickComment] = useState('');
  const [quickTagError, setQuickTagError] = useState<string | null>(null);
  // Kaydedilmiş item ID’leri
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newRating, setNewRating] = useState<number>(0);
  const [loadedOnce, setLoadedOnce] = useState(false);
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
  const quickAddRef = useRef<HTMLDivElement>(null);

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
      // Eğer /share/:id yolundaysak ana sayfaya dön
      if (url.pathname.startsWith('/share/')) {
        url.pathname = '/';
      }
      // Eski davranışla uyum: ?item=... varsa temizle
      if (url.searchParams.has('item')) {
        url.searchParams.delete('item');
      }
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
  // Seçili etiket sayıları (başlıklarda göstermek için)
  const selectedInTrending = useMemo(
    () => trending.filter(t => selectedTags.has(t)).length,
    [trending, selectedTags]
  );
  const selectedInAllTags = useMemo(
    () => allTags.filter(t => selectedTags.has(t)).length,
    [allTags, selectedTags]
  );

  // Aktif oturum (sadece kendi yorumlarım için çöp kutusunu gösterebilmek adına)
  const { data: session } = useSession();
  const myId = (session as any)?.user?.id ?? null;
  const amAdmin = Boolean((session as any)?.user?.isAdmin) || ((session as any)?.user?.email === ADMIN_EMAIL);
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
        fetchItemsRes(`/api/items?${qs.toString()}`, '/api/items'),
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
      setLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); loadSavedIds(); }, []);
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
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      // 1) /share/:id yolu
      const m = u.pathname.match(/^\/share\/([^/?#]+)/);
      if (m && m[1]) {
        setSharedId(m[1]);
        return;
      }
      // 2) ?item=... sorgu paramı (geriye dönük uyumluluk)
      const id = u.searchParams.get('item');
      setSharedId(id);
    } catch {}
  }, []);
  // Hash'ten #quick-add yakala → Hızlı Ekle'yi aç
  useEffect(() => {
    function syncFromHash() {
      try {
        const hash = window.location.hash;
        if (hash === '#quick-add') {
          setShowQuickAdd(true);
          // render tamamlandıktan sonra doğru yere smooth scroll + focus
          requestAnimationFrame(() => {
            const el = quickAddRef.current;
            if (el) smoothScrollIntoView(el);
            setTimeout(() => {
              quickNameRef.current?.focus();
              quickNameRef.current?.select();
            }, 150);
          });
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
      } catch {
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
      setPreviewItems([]);
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
        imageUrl: String(form.get('imageUrl') || '') || null, // ImageUploader, hidden input ile bunu dolduruyor
      };
      const res = await fetchOrSignin('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res) return false;
      const j = await res.json().catch(()=>null);
      if (j?.ok) {
  setQInput('');
  setQCommitted('');
  await load();
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
        return true;
      } else {
        alert('Hata: ' + (j?.error || res.status));
        return false;
      }
    } finally { setAdding(false); }
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

  function jumpToQuickAdd() {
    try {
      const url = new URL(window.location.href);
      url.hash = 'quick-add';
      window.history.replaceState({}, '', url.toString());
    } catch {}
    const name = qInput.trim();
    if (name) setQuickName(name);
    setShowQuickAdd(true);

    // spotlight açıksa kapat
    setSharedItem(null);
    setSharedId(null);

    // Mevcut filtrelerden hızlı ekle formunu doldur
    // Etiketler: maksimum 3
    if (selectedTags.size > 0) {
      setQuickTags(Array.from(selectedTags).slice(0, 3));
      setQuickTagInput('');
    }
    // Yıldız: yalnızca tek kova seçiliyse otomatik doldur
    {
      const stars = Array.from(starBuckets);
      setNewRating(stars.length === 1 ? stars[0] : 0);
    }

    // render’ı bekleyip doğru yere smooth scroll
    requestAnimationFrame(() => {
      const el = quickAddRef.current;
      if (el) smoothScrollIntoView(el);
    });

    setTimeout(() => {
      quickNameRef.current?.focus();
      quickNameRef.current?.select();
    }, 150);
  }

  async function report(id: string) {
    const res = await fetchOrSignin(`/api/items/${id}/report`, { method: 'POST' });
    if (!res) return;
    const j = await res.json().catch(() => null);
    if (j?.ok) alert(`Report alındı (${j.count})`);
    else alert('Hata: ' + (j?.error || res.status));
  }

  async function deleteItem(id: string) {
    if (!confirm('Bu öğeyi kaldırmak istiyor musun?')) return;
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

  // Spotlight kartındaki "Listede göster" davranışı
  function showInList(id: string) {
    setSharedItem(null);
    // Eğer filtreler sonucu gizliyorsa kaldır
    setStarBuckets(new Set());
    setSelectedTags(new Set());
    // Küçük bir gecikmeden sonra kaydır
    setTimeout(() => scrollToItem(id), 100);
  }

  

  function openSpotlight(id: string, fromDelta: boolean = false) {
    setShowQuickAdd(false);
    if (!fromDelta) setNavDir(0);
    setSharedId(id);
    try {
      const url = new URL(window.location.href);
      // Adres çubuğunu /share/:id olarak güncelle (SPA içinde sayfayı yenilemeden)
      url.pathname = `/share/${id}`;
      // Eski query paramını sil (varsa)
      if (url.searchParams.has('item')) url.searchParams.delete('item');
      window.history.replaceState({}, '', url.toString());
    } catch {}
    if (!fromDelta) {
      pendingSpotlightScrollRef.current = true;
    }
  }
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

  const clamp2: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'normal',
    overflowWrap: 'normal',
    hyphens: 'auto',
  };

  const quickFormRef = useRef<HTMLFormElement>(null);
  const quickValid = quickName.trim().length > 0 && quickTags.length > 0 && newRating > 0;
  const hasBannedName = containsBannedWord(quickName);
  const hasBannedComment = containsBannedWord(quickComment);
  const hasBannedTag = quickTags.some(t => containsBannedWord(t));
  const quickBlocked = hasBannedName || hasBannedComment || hasBannedTag;

  // Quick-add spotlight kapanınca formu ve alanları sıfırla
  useEffect(() => {
    if (!showQuickAdd) {
      // Form ve alanları sıfırla
      try { quickFormRef.current?.reset(); } catch {}
      setQuickName('');
      setQuickTagInput('');
      setQuickTags([]);
      setNewRating(0);
      setNewImage(null);
      setQuickComment('');
      setQuickTagError(null);
    }
  }, [showQuickAdd]);

  function normalizeTag(s: string) {
    return s.trim().replace(/^#+/, '').toLowerCase();
  }
  function addTagsFromInput(src?: string) {
    const raw = typeof src === 'string' ? src : quickTagInput;
    const parts = raw.split(',').map(normalizeTag).filter(Boolean);
    if (parts.length === 0) return;
    let bannedHit = false;
    setQuickTags(prev => {
      const set = new Set(prev);
      for (const p of parts) {
        if (set.size >= 3) break; // cap at 3
        if (containsBannedWord(p)) { bannedHit = true; continue; }
        set.add(p);
      }
      return Array.from(set).slice(0,3);
    });
    setQuickTagInput('');
    setQuickTagError(bannedHit ? 'Etikette yasaklı kelime kullanılamaz.' : null);
  }

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
     <Header controls={{
  q: qInput,
  onQ: setQInput,
  order,
  onOrder: setOrder,
  starBuckets: Array.from(starBuckets),
  onStarBuckets: (arr)=>setStarBuckets(new Set(arr)),
  onCommit: () => setQCommitted(qInput),
  suggestions,
  onClickSuggestion: (s) => { setQInput(s); setQCommitted(s); },
  tagMatches: tagHits,
  onClickTagMatch: (t: string) => {
    if (!t) return;
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.add(t);
      return next;
    });
    setQCommitted(qInput);
    setShowQuickAdd(false);
    setSharedItem(null);
    setSharedId(null);
  },
  showSuggestions: qInput !== qCommitted,
}} />
     
     
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
  word-break: break-word;
  overflow-wrap: break-word;
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
    }
      `}
      </style>
      

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Sol: etiketler */}
        <aside className="hidden md:block">
         
          <CollapsibleSection
            title={`Trend Etiketler${selectedInTrending ? ` (${selectedInTrending} seçili)` : ''}`}
            defaultOpen={true}
            className="border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20"
            summaryClassName="text-violet-900 dark:text-violet-200"
          >
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <Tag
                  key={t}
                  label={t}
                  active={selectedTags.has(t)}
                  onClick={() => {
                    setSelectedTags(prev => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t); else next.add(t);
                      return next;
                    });
                  }}
                  onDoubleClick={() => setSelectedTags(new Set())}
                  className={
                    selectedTags.has(t)
                      ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow'
                      : 'bg-violet-500/10 text-violet-900 border-violet-300 hover:bg-violet-500/20 dark:bg-violet-400/10 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-400/20'
                  }
                />
              ))}
            </div>
          </CollapsibleSection>

          <div className="h-4" />

          <CollapsibleSection title={`Tüm Etiketler${selectedInAllTags ? ` (${selectedInAllTags} seçili)` : ''}`} defaultOpen={false}>
            <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-auto pr-1">
              {allTags.map((t) => (
                <Tag
                  key={t}
                  label={t}
                  active={selectedTags.has(t)}
                  onClick={() => {
                    setSelectedTags(prev => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t); else next.add(t);
                      return next;
                    });
                  }}
                  onDoubleClick={() => setSelectedTags(new Set())}
                  className={
                    trending.includes(t)
                      ? (selectedTags.has(t)
                          ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow'
                          : 'bg-violet-500/10 text-violet-900 border-violet-300 hover:bg-violet-500/20 dark:bg-violet-400/10 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-400/20')
                      : ''
                  }
                />
              ))}
            </div>
          </CollapsibleSection>
          {/* Sıralama + Yıldız filtresi (styled, alt tarafta) */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3 mt-4">
            {/* Sıralama */}
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sıralama</div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className={`rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1.5 text-sm transition-colors ${
                    order === 'new'
                      ? 'border-gray-400 dark:border-gray-500'
                      : ''
                  }`}
                  onClick={() => setOrder('new')}
                  aria-pressed={order === 'new'}
                >
                  En yeni
                </button>
                <button
                  type="button"
                  className={`rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1.5 text-sm transition-colors ${
                    order === 'top'
                      ? 'border-gray-400 dark:border-gray-500'
                      : ''
                  }`}
                  onClick={() => setOrder('top')}
                  aria-pressed={order === 'top'}
                >
                  En yüksek puan
                </button>
              </div>
            </div>
            {/* Divider before Yıldızlar */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Yıldızlar</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {[1,2,3,4,5].map((n) => {
                  const active = starBuckets.has(n);
                  return (
                    <button
                      key={`sb-${n}`}
                      type="button"
                      className={
                        active
                          ? "rounded-full bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100 hover:shadow-[0_0_0_2px_rgba(250,204,21,0.3)] px-3 py-1.5 text-sm flex items-center gap-1 transition-colors"
                          : "rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-[0_0_0_2px_rgba(250,204,21,0.3)] px-3 py-1.5 text-sm flex items-center gap-1 transition-colors"
                      }
                      onClick={() => {
                        setStarBuckets(prev => {
                          const next = new Set(prev);
                          if (next.has(n)) next.delete(n); else next.add(n);
                          return next;
                        });
                      }}
                      aria-pressed={active}
                      title={`${n} yıldız`}
                    >
                      {n} <span aria-hidden="true">★</span>
                    </button>
                  );
                })}
                {starBuckets.size > 0 && (
                  <button
                    type="button"
                    className="ml-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-[0_0_0_2px_rgba(250,204,21,0.3)] px-3 py-1.5 text-sm flex items-center gap-1 transition-colors"
                    onClick={() => { setStarBuckets(new Set()); setQInput(''); setQCommitted(''); }}
                    title="Filtreyi temizle"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Sağ: listeler */}
        <section className="rs-mobile-edge space-y-4 order-2 md:order-2">

          {/* QUICK-ADD SPOTLIGHT (moved into list column) */}
{showQuickAdd && (
  <div ref={quickAddRef} className="scroll-mt-24 relative rounded-2xl border p-4 shadow-sm bg-emerald-50/70 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/40 flex flex-col">
    {/* CLOSE (X) */}
    <button
      className="rs-pop absolute top-3 right-3 z-30 w-8 h-8 grid place-items-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300"
      onClick={() => {
        setShowQuickAdd(false);
        // URL'de #quick-add varsa temizle
        try {
          if (window.location.hash === '#quick-add') {
            const url = new URL(window.location.href);
            url.hash = '';
            window.history.replaceState({}, '', url.toString());
          }
        } catch {}
      }}
      aria-label="Hızlı ekle panelini kapat"
      title="Kapat"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>

    <div className="mb-2">
      <h3 className="text-base md:text-lg font-semibold">Hızlı ekle</h3>
      <p className="text-xs opacity-70">En fazla 3 etiket ekleyebilirsin</p>
      {/* SEO: JSON-LD */}
      <SeoLD json={websiteLD} />
      <SeoLD json={orgLD} />
      {itemLD && <SeoLD json={itemLD} />}
    </div>

    <form
      ref={quickFormRef}
      className="relative rounded-2xl border p-4 shadow-sm bg-transparent dark:bg-transparent border-emerald-200 dark:border-emerald-900/40 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (quickBlocked) { alert('Yasaklı kelime içeriyor. Lütfen düzelt.'); return; }
        const fd = new FormData(e.currentTarget);
        const nameVal = String(fd.get('name') || '').trim();
        if (!nameVal) { alert('Ad gerekli'); return; }
        if (quickTags.length === 0) { alert('En az bir etiket eklemelisin'); return; }
        if (!newRating || newRating < 1) { alert('Puan seçmelisin'); return; }
        const ok = await addItem(fd);
        if (ok) {
          quickFormRef.current?.reset();
          setQuickName(''); setNewRating(0); setNewImage(null);
          setQuickTags([]); setQuickTagInput('');
          setShowQuickAdd(false);
        }
      }}
    >
            {justAdded && (
              <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800 shadow-sm opacity-0 animate-[fadeInOut_1.6s_ease]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-sm font-medium">Eklendi</span>
                </div>
              </div>
            )}

            {/* 1. satır: Ad + Kısa açıklama + Etiketler */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={quickNameRef}
                name="name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className={`border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] focus:outline-none ${hasBannedName ? 'border-red-500 focus:ring-red-500 dark:border-red-600' : 'focus:ring-2 focus:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100'}`}
                placeholder="adı *"
                required
              />
              {hasBannedName && <span className="text-xs text-red-600">Item adında yasaklı kelime var.</span>}
              <input
                name="desc"
                className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                placeholder="kısa açıklama (opsiyonel)"
              />
              <div className="flex-1 min-w-[200px]">
                <div className={`border rounded-xl px-2 py-1.5 flex flex-wrap gap-1 focus-within:ring-2 ${hasBannedTag ? 'border-red-500 ring-red-500 dark:border-red-600' : 'focus-within:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700'}`}>
                  {quickTags.map(t => (
                    <span
                      key={t}
                      className={(trending.includes(t) ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600') + ' inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border'}
                    >
                      #{t}
                      <button
                        type="button"
                        className="ml-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                        onClick={() => setQuickTags(prev => prev.filter(x => x !== t))}
                        aria-label={`#${t} etiketini kaldır`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    value={quickTagInput}
                    onChange={e => setQuickTagInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && quickTags.length < 3) {
                        e.preventDefault();
                        addTagsFromInput();
                      } else if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault(); // stop adding beyond 3
                      }
                    }}
                    onBlur={() => addTagsFromInput()}
                    placeholder={quickTags.length >= 3 ? 'En fazla 3 etiket' : (quickTags.length ? '' : 'etiketler (virgülle) *')}
                    className="flex-1 min-w-[120px] px-2 py-1 text-sm bg-transparent outline-none"
                    disabled={quickTags.length >= 3}
                  />
                </div>
                {(hasBannedTag || quickTagError) && (
                  <span className="text-xs text-red-600">Etiketlerde yasaklı kelime var.</span>
                )}
                <input type="hidden" name="tags" value={quickTags.join(',')} />
              </div>
            </div>

            {/* 2. satır: Yıldız seçimi + Yorum */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-70">Puanın<span className="text-red-500">*</span>:</span>
                <Stars value={newRating} onRate={(n) => setNewRating(n)} />
              </div>
              <input type="hidden" name="rating" value={newRating} />
              <input
                name="comment"
                value={quickComment}
                onChange={(e) => setQuickComment(e.target.value)}
                className={`border rounded-xl px-3 py-2 text-sm flex-1 min-w-[220px] focus:outline-none ${hasBannedComment ? 'border-red-500 focus:ring-red-500 dark:border-red-600' : 'focus:ring-2 focus:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100'}`}
                placeholder="yorum (opsiyonel)"
              />
              {hasBannedComment && <span className="text-xs text-red-600">Yorumda yasaklı kelime var.</span>}
            </div>

            {/* 3. satır: Resim ekle */}
            <div>
              <div className="text-sm font-medium mb-2">Resim ekle (opsiyonel)</div>
              <ImageUploader value={newImage} onChange={setNewImage} />
              <input type="hidden" name="imageUrl" value={newImage ?? ''} />
            </div>

            {/* 4. satır: Gönder */}
            <div className="flex items-center gap-3 justify-end pt-1">
              {!myId ? (
                <>
                  <button
                    disabled
                    className="px-4 py-2.5 rounded-xl text-sm md:text-base bg-emerald-600 text-white opacity-60 cursor-not-allowed"
                    title="Önce giriş yapmalısın"
                  >
                    Ekle
                  </button>
                  <span className="text-sm opacity-80">
                    eklemek için{' '}
                    <button
                      type="button"
                      className="underline hover:opacity-100"
                      onClick={() => {
                        try {
                          const back = encodeURIComponent(window.location.href);
                          window.location.href = `/api/auth/signin?callbackUrl=${back}`;
                        } catch {
                          window.location.href = '/api/auth/signin';
                        }
                      }}
                    >
                      giriş yap
                    </button>
                  </span>
                </>
              ) : (
                <button
                  disabled={adding || quickBlocked || !quickValid}
                  title={quickBlocked ? 'Yasaklı kelime içeriyor' : undefined}
                  className="px-4 py-2.5 rounded-xl text-sm md:text-base bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {adding ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      </svg>
                      Ekleniyor…
                    </span>
                  ) : (
                    'Ekle'
                  )}
                </button>
              )}
            </div>
    </form>
  </div>
)}
          
          {/* Paylaşımdan gelen tek öğe (spotlight) */}
          {!showQuickAdd && sharedItem && (
  <div
    ref={spotlightRef}
    className={
      `scroll-mt-24 relative rounded-2xl border p-4 pl-12 pr-12 md:pl-14 md:pr-14 shadow-md bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800 ring-1 ring-black/5 dark:ring-white/5 flex flex-col transition-transform duration-150`
    }
  >
    {amAdmin && ((sharedItem as any).reportCount ?? 0) > 0 && (
      <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40">
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 18H3L12 3z" fill="currentColor"/></svg>
        <span className="tabular-nums">{(sharedItem as any).reportCount}</span>
      </div>
    )}
    {/* CLOSE (X) */}
    <button
      className="rs-pop absolute top-3 right-3 z-30 w-8 h-8 grid place-items-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300"
      onClick={closeSpotlight}
      aria-label="Spotlight kartını kapat"
      title="Kapat"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
    {/* LEFT TOP: Share + Options */}
    <div className="rs-pop absolute top-12 right-3 z-20 flex flex-col gap-2">
      <div className="relative">
        <button
          className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
          aria-label="share"
          onClick={() => setOpenShare(openShare === sharedItem.id ? null : sharedItem.id)}
        >
          {/* share icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        {openShare === sharedItem.id && (
          <div className="rs-pop absolute right-10 top-0 z-30 w-44 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1">
            <button
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => { copyShareLink(sharedItem.id); setOpenShare(null); }}
            >
              Kopyala
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => { nativeShare(sharedItem.id, sharedItem.name); setOpenShare(null); }}
            >
              Daha fazla seçenek
            </button>
          </div>
        )}
      </div>
      <div className="relative">
        <button
          className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
          onClick={() => setOpenMenu(openMenu === sharedItem.id ? null : sharedItem.id)}
          aria-label="options"
        >
          ⋯
        </button>
        {openMenu === sharedItem.id && (
          <div className="rs-pop absolute right-10 top-0 z-30 w-56 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1">
            {amAdmin && (
              <>
                <button
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={() => { setOpenMenu(null); deleteItem(sharedItem.id); }}
                >Kaldır</button>
                <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
              </>
            )}
            <button
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                savedIds.has(sharedItem.id)
                  ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => { setOpenMenu(null); toggleSave(sharedItem.id); }}
            >
              {savedIds.has(sharedItem.id) ? 'Kaydedilenlerden Kaldır' : 'Kaydet'}
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => { setOpenMenu(null); report(sharedItem.id); }}
            >
              Report
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => { setOpenMenu(null); showInList(sharedItem.id); }}
            >
              Listede göster
            </button>
          </div>
        )}
      </div>
    </div>
    {/* Spotlight navigation arrows */}
    {(currentIndex >= 0) && (
      <>
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border bg-white/80 dark:bg-gray-800/80 p-2 shadow disabled:opacity-40"
          onClick={() => openByDelta(-1)}
          disabled={currentIndex <= 0}
          aria-label="Önceki öğe"
          title="Önceki (←)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border bg-white/80 dark:bg-gray-800/80 p-2 shadow disabled:opacity-40"
          onClick={() => openByDelta(1)}
          disabled={currentIndex === filteredItems.length - 1}
          aria-label="Sonraki öğe"
          title="Sonraki (→)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </>
    )}

    {/* CONTENT (animated on left/right nav) */}
    <div
      key={animKey}
      className={animArmed ? (navDir === 1 ? 'animate-slideInFromRight' : navDir === -1 ? 'animate-slideInFromLeft' : '') : ''}
      style={{ willChange: 'transform' }}
    >
      <div className="flex items-start gap-3">
    <div className="flex flex-col items-center shrink-0 w-28">
  <img
    src={sharedItem.imageUrl || '/default-item.svg'}
    alt={sharedItem.name || 'item'}
    width={112}
    height={112}
    decoding="async"
    loading="eager"
    // @ts-ignore - experimental
    fetchPriority="high"
    className="w-28 h-28 object-cover rounded-lg"
    style={{ contentVisibility: 'auto' }}
  />
  {sharedItem.edited && (
    <span className="text-[11px] px-2 py-0.5 mt-1 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">düzenlendi</span>
  )}
</div>

      <div className="flex-1 min-w-0">
      <h3 className="text-base md:text-lg font-semibold leading-snug pr-16 md:pr-24 title-wrap md-clamp2" title={sharedItem.name} lang="tr">
  {sharedItem.name}
</h3>

        <p className="text-sm opacity-80 mt-1 break-words">{sharedItem.description}</p>

        {sharedItem.createdBy && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
            {sharedItem.createdBy.avatarUrl ? (
              <img
                src={sharedItem.createdBy.avatarUrl}
                alt={((sharedItem.createdBy as any)?.verified ? sharedItem.createdBy.name : maskName(sharedItem.createdBy.name)) || 'u'}
                className="w-5 h-5 rounded-full object-cover"
                title={((sharedItem.createdBy as any)?.verified ? sharedItem.createdBy.name : maskName(sharedItem.createdBy.name)) || 'u'}
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px]"
                title={((sharedItem.createdBy as any)?.verified ? sharedItem.createdBy.name : maskName(sharedItem.createdBy.name)) || 'u'}
              >
                {( ((sharedItem.createdBy as any)?.verified ? sharedItem.createdBy.name : maskName(sharedItem.createdBy.name)) || 'u' ).charAt(0).toUpperCase()}
              </div>
            )}
            <span>
              {(sharedItem.createdBy as any)?.verified ? (sharedItem.createdBy.name || 'Anonim') : maskName(sharedItem.createdBy.name)}
            </span>
            {(sharedItem.createdBy as any).verified && (
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-4 h-4 align-middle">
                <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}

        {/* Tek satır: Ortalama yıldızlar + adet (ufak pill) */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {/* Ortalama yıldızlar (display only) */}
          <Stars rating={sharedItem.avgRating ?? sharedItem.avg ?? 0} readOnly />
         <RatingPill avg={sharedItem.avgRating ?? sharedItem.avg} count={sharedItem.count} />
        </div>

        
      </div>
    </div>

    {sharedItem.tags?.length > 0 && (
      <div className="mt-2 pt-2 border-t dark:border-gray-800">
        <div className="w-full flex flex-wrap items-center gap-1 justify-start text-left">
          {sharedItem.tags.slice(0, 10).map((t) => (
            <Tag key={t} label={t} className="ml-0 inline-flex" />
          ))}
        </div>
      </div>
    )}

    {sharedItem.comments?.length > 0 && <div className="mt-3 border-t dark:border-gray-800" />}

      {sharedItem.comments?.length > 0 && (
  (() => {
    const my = myId ? sharedItem.comments.find(c => c.user?.id === myId) : null;
    const othersAll = sharedItem.comments.filter(c => c.id !== (my?.id || ''));
    const displayOthers = othersAll.slice(0, spotlightShowCount);
    const hasMoreOthers = othersAll.length > spotlightShowCount;

    return (
      <div className="pt-3 space-y-2 text-sm leading-relaxed">
            {/* Başkalarının yorumları */}
            {displayOthers.map((c) => {
              const isEditing = editingCommentId === c.id;
              return (
                <div key={c.id}>
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {c.user?.avatarUrl ? (
                        <img src={c.user.avatarUrl} alt={maskName(c.user?.name)} className="w-5 h-5 rounded-full object-cover mt-0.5" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] mt-0.5">
                          {(maskName(c.user?.name) || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs opacity-70 flex items-center">
                          {((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name))}
                          {(c.user as any)?.verified && (
                            <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block ml-1 w-4 h-4 align-middle">
                              <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                              <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          {c.rating ? (
                            <span className="ml-1 inline-block bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">{c.rating}★</span>
                          ) : null}
                        </div>
                        {(() => {
                          const isOpen = expandedComments.has(c.id);
                          const isTrunc = truncatedComments.has(c.id);
                          const longish = (c.text || '').length >= 60;
                          if (isOpen) {
                            return (
                              <div className="flex items-start gap-2 justify-between">
                                <div className="flex-1">
                                  <div className="whitespace-pre-wrap break-words">
                                    “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                                  </div>
                                  {(isTrunc || longish) && (
                                    <button
                                      type="button"
                                      className="mt-1 text-[11px] underline opacity-70 hover:opacity-100"
                                      onClick={() => setExpandedComments(p => { const n=new Set(p); n.delete(c.id); return n; })}
                                    >daha az</button>
                                  )}
                                </div>
                                {(c.user?.id === myId) ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 select-none mt-0.5" aria-label="Yorum puanı">
                                    <span className="px-1 py-0.5 rounded pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800" title="Upvote">▲</span>
                                    <span className="tabular-nums text-xs opacity-80">{typeof c.score === 'number' ? c.score : 0}</span>
                                    <span className="px-1 py-0.5 rounded pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800" title="Downvote">▼</span>
                                  </span>
                                ) : (
                                  <span className="shrink-0 inline-flex items-center gap-1 select-none mt-0.5">
                                    <button
                                      type="button"
                                      className={`px-1 py-0.5 rounded ${c.myVote === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                      title="Upvote"
                                      onClick={() => voteOnComment(c.id, c.myVote === 1 ? 0 : 1)}
                                    >▲</button>
                                    <span className="tabular-nums text-xs opacity-80">{typeof c.score === 'number' ? c.score : 0}</span>
                                    <button
                                      type="button"
                                      className={`px-1 py-0.5 rounded ${c.myVote === -1 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                      title="Downvote"
                                      onClick={() => voteOnComment(c.id, c.myVote === -1 ? 0 : -1)}
                                    >▼</button>
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-start gap-2 justify-between min-w-0">
                              <div className="min-w-0 flex items-baseline gap-1 flex-1">
                                <div
                                  ref={(el) => { commentTextRefs.current[c.id] = el; if (el) setTimeout(() => measureTruncation(c.id), 0); }}
                                  className="truncate w-full"
                                >
                                  “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                                </div>
                                {(isTrunc || longish) && (
                                  <button
                                    type="button"
                                    className="shrink-0 text-[11px] underline opacity-70 hover:opacity-100"
                                    onClick={() => setExpandedComments(p => new Set(p).add(c.id))}
                                  >devamını gör</button>
                                )}
                              </div>
                              {(c.user?.id === myId) ? (
                                <span className="shrink-0 inline-flex items-center gap-1 select-none" aria-label="Yorum puanı">
                                  <span className="px-1 py-0.5 rounded pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800" title="Upvote">▲</span>
                                  <span className="tabular-nums text-xs opacity-80">{typeof c.score === 'number' ? c.score : 0}</span>
                                  <span className="px-1 py-0.5 rounded pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800" title="Downvote">▼</span>
                                </span>
                              ) : (
                                <span className="shrink-0 inline-flex items-center gap-1 select-none">
                                  <button
                                    type="button"
                                    className={`px-1 py-0.5 rounded ${c.myVote === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                    title="Upvote"
                                    onClick={() => voteOnComment(c.id, c.myVote === 1 ? 0 : 1)}
                                  >▲</button>
                                  <span className="tabular-nums text-xs opacity-80">{typeof c.score === 'number' ? c.score : 0}</span>
                                  <button
                                    type="button"
                                    className={`px-1 py-0.5 rounded ${c.myVote === -1 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                    title="Downvote"
                                    onClick={() => voteOnComment(c.id, c.myVote === -1 ? 0 : -1)}
                                  >▼</button>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  {/* başkalarında edit/sil yok */}
                  {!isEditing && null}
                </div>
              );
            })}
        {hasMoreOthers && (
          <div className="pt-1">
            <button
              type="button"
              className="text-[12px] underline opacity-75 hover:opacity-100"
              onClick={() => setSpotlightShowCount(n => n + 7)}
            >
              daha fazla gör
            </button>
          </div>
        )}

        {/* Senin yorumun – en altta, highlight’lı */}
        {my && (() => {
          const c = my;
          const isEditing = editingCommentId === c.id;
          return (
            <div key={c.id} className="flex items-start gap-2 justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-900/20 p-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                {c.user?.avatarUrl ? (
                  <img src={c.user.avatarUrl} alt={maskName(c.user?.name)} className="w-5 h-5 rounded-full object-cover mt-0.5" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] mt-0.5">
                    {(maskName(c.user?.name) || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs opacity-70 flex items-center">
                    Senin yorumun
                    {c.rating ? (
                      <span className="ml-2 inline-block bg-emerald-200 text-emerald-900 text-[11px] px-2 py-0.5 rounded-full">{c.rating}★</span>
                    ) : null}
                  </div>

                  {!isEditing ? (
                    (() => {
                      const isOpen = expandedComments.has(c.id);
                      const isTrunc = truncatedComments.has(c.id);
                      const longish = (c.text || '').length >= 60;

                      if (isOpen) {
                        return (
                          <div className="w-full">
                            <div className="whitespace-pre-wrap break-words">“{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}</div>
                            {(isTrunc || longish) && (
                              <button
                                type="button"
                                className="mt-1 text-[11px] underline opacity-70 hover:opacity-100"
                                onClick={() => setExpandedComments(p => { const n=new Set(p); n.delete(c.id); return n; })}
                              >daha az</button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="w-full flex items-baseline gap-1 min-w-0">
                          <div
                            ref={(el) => { commentTextRefs.current[c.id] = el; if (el) setTimeout(() => measureTruncation(c.id), 0); }}
                            className="truncate w-full"
                          >
                            “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                          </div>
                          {(isTrunc || longish) && (
                            <button
                              type="button"
                              className="shrink-0 text-[11px] underline opacity-70 hover:opacity-100"
                              onClick={() => setExpandedComments(p => new Set(p).add(c.id))}
                            >devamını gör</button>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-70">Puanın<span className="text-red-500">*</span>:</span>
                        <Stars rating={editingCommentRating} onRatingChange={setEditingCommentRating} size="sm" />
                      </div>
                      <textarea
                        className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                        rows={3}
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2.5 py-1.5 rounded-lg border text-xs bg-black text-white disabled:opacity-50"
                          onClick={async () => {
                            if (!editingCommentRating) return;
                            const ok = await updateComment(c.id, editingCommentText, sharedItem!.id, editingCommentRating);
                            if (ok) {
                              setEditingCommentId(null);
                              setEditingCommentItem(null);
                              setEditingCommentText('');
                              setEditingCommentRating(0);
                            }
                          }}
                          disabled={!editingCommentRating}
                        >Kaydet</button>
                        <button
                          className="px-2.5 py-1.5 rounded-lg border text-xs"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingCommentItem(null);
                            setEditingCommentText('');
                            setEditingCommentRating(0);
                          }}
                        >Vazgeç</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!isEditing && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="shrink-0 inline-flex items-center gap-1 select-none" aria-label="Yorum puanı">
                    <span className="px-1 py-0.5 rounded pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800" title="Upvote">▲</span>
                    <span className="tabular-nums text-xs opacity-80">{typeof c.score === 'number' ? c.score : 0}</span>
                    <span className="px-1 py-0.5 rounded pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800" title="Downvote">▼</span>
                  </span>
                  <button
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Yorumu düzenle"
                    onClick={() => {
                      setEditingCommentId(c.id);
                      setEditingCommentItem(null);
                      setEditingCommentText(c.text);
                      setEditingCommentRating(c.rating || 0);
                    }}
                  >
                    {/* kalem */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.6" fill="currentColor"/><path d="M14.06 4.94l3.75 3.75 1.44-1.44a2.12 2.12 0 0 0 0-3l-.75-.75a2.12 2.12 0 0 0-3 0l-1.44 1.44z" stroke="currentColor" strokeWidth="1.6" fill="currentColor"/></svg>
                  </button>
                  <button
                    className={`p-1.5 rounded-md ${confirmDeleteId === c.id ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'}`}
                    title={confirmDeleteId === c.id ? 'Silmek için tekrar tıkla' : 'Yorumu sil'}
                    onClick={() => {
                      if (confirmDeleteId !== c.id) {
                        setConfirmDeleteId(c.id);
                        return;
                      }
                      deleteComment(c.id);
                    }}
                  >
                    {confirmDeleteId === c.id ? (
                      // check icon
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      // trash icon
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  })()
)}
    {/* Comment input for spotlight (tek yorum kuralı) */}
    {!(sharedItem as any).myCommentId && (
      <div className="mt-3 pt-3 border-t dark:border-gray-800">
        <CommentBox
          itemId={sharedItem.id}
          onDone={async () => {
            await load();
            await refreshShared(sharedItem.id);
          }}
          initialRating={0}
        />
      </div>
    )}
      </div>
    </div>
  )}
          {/* MOBIL: Etiketler/Filtreler (spotlight altı) */}
<div className="md:hidden space-y-4">
  <CollapsibleSection
    title={`Trend Etiketler${selectedInTrending ? ` (${selectedInTrending} seçili)` : ''}`}
    defaultOpen={true}
    className="border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20"
    summaryClassName="text-violet-900 dark:text-violet-200"
  >
    <div className="flex flex-wrap gap-2">
      {trending.map((t) => (
        <Tag
          key={t}
          label={t}
          active={selectedTags.has(t)}
          onClick={() => {
            setSelectedTags(prev => {
              const next = new Set(prev);
              if (next.has(t)) next.delete(t); else next.add(t);
              return next;
            });
          }}
          onDoubleClick={() => setSelectedTags(new Set())}
          className={
            selectedTags.has(t)
              ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow'
              : 'bg-violet-500/10 text-violet-900 border-violet-300 hover:bg-violet-500/20 dark:bg-violet-400/10 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-400/20'
          }
        />
      ))}
    </div>
  </CollapsibleSection>

  <CollapsibleSection title={`Tüm Etiketler${selectedInAllTags ? ` (${selectedInAllTags} seçili)` : ''}`} defaultOpen={false}>
    <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-auto pr-1">
      {allTags.map((t) => (
        <Tag
          key={t}
          label={t}
          active={selectedTags.has(t)}
          onClick={() => {
            setSelectedTags(prev => {
              const next = new Set(prev);
              if (next.has(t)) next.delete(t); else next.add(t);
              return next;
            });
          }}
          onDoubleClick={() => setSelectedTags(new Set())}
          className={
            trending.includes(t)
              ? (selectedTags.has(t)
                  ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow'
                  : 'bg-violet-500/10 text-violet-900 border-violet-300 hover:bg-violet-500/20 dark:bg-violet-400/10 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-400/20')
              : ''
          }
        />
      ))}
    </div>
  </CollapsibleSection>

  {/* Sıralama + Yıldız filtresi (compact) */}
<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3 mt-4">
  {/* Sıralama (desktop-like on mobile) */}
  <div>
    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sıralama</div>
    <div className="flex gap-2 mt-2">
      <button
        type="button"
        className={`rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1.5 text-sm transition-colors ${order === 'new' ? 'border-gray-400 dark:border-gray-500' : ''}`}
        onClick={() => setOrder('new')}
        aria-pressed={order === 'new'}
      >
        En yeni
      </button>
      <button
        type="button"
        className={`rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1.5 text-sm transition-colors ${order === 'top' ? 'border-gray-400 dark:border-gray-500' : ''}`}
        onClick={() => setOrder('top')}
        aria-pressed={order === 'top'}
      >
        En yüksek puan
      </button>
    </div>
  </div>

  {/* Divider before Yıldızlar */}
  <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Yıldızlar</div>
    <div className="flex flex-wrap gap-2 mt-2">
      {[1,2,3,4,5].map((n) => {
        const active = starBuckets.has(n);
        return (
          <button
            key={`sbm-${n}`}
            type="button"
            className={
              active
                ? "rounded-full bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100 hover:shadow-[0_0_0_2px_rgba(250,204,21,0.3)] px-3 py-1.5 text-sm flex items-center gap-1 transition-colors"
                : "rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-[0_0_0_2px_rgba(250,204,21,0.3)] px-3 py-1.5 text-sm flex items-center gap-1 transition-colors"
            }
            onClick={() => {
              setStarBuckets(prev => {
                const next = new Set(prev);
                if (next.has(n)) next.delete(n); else next.add(n);
                return next;
              });
            }}
            aria-pressed={active}
            title={`${n} yıldız`}
          >
            {n} <span aria-hidden="true">★</span>
          </button>
        );
      })}
      {starBuckets.size > 0 && (
        <button
          type="button"
          className="ml-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-[0_0_0_2px_rgba(250,204,21,0.3)] px-3 py-1.5 text-sm flex items-center gap-1 transition-colors"
          onClick={() => { setStarBuckets(new Set()); setQInput(''); setQCommitted(''); }}
          title="Filtreyi temizle"
        >
          Temizle
        </button>
      )}
    </div>
  </div>
</div>
</div>

          {loading && <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">Yükleniyor…</div>}

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
          <div className="grid md:grid-cols-2 gap-4">
            {/* + EKLE KARTI (her zaman en başta) */}
            <button
              type="button"
            onClick={() => {
  // varsa açık spotlight'ı kapat
  setSharedItem(null);
  setSharedId(null);

  // Mevcut filtrelerden hızlı eklemeyi önceden doldur
  if (qInput.trim()) setQuickName(qInput.trim());
  if (selectedTags.size > 0) {
    setQuickTags(Array.from(selectedTags).slice(0, 3));
    setQuickTagInput('');
  }
  {
    const stars = Array.from(starBuckets);
    setNewRating(stars.length === 1 ? stars[0] : 0);
  }

  setShowQuickAdd(true);

  requestAnimationFrame(() => {
    const el = quickAddRef.current;
    if (el) smoothScrollIntoView(el);
  });

  setTimeout(() => { quickNameRef.current?.focus(); }, 100);
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
            {filteredItems.map((i) => {
              const isSaved = savedIds.has(i.id);
              return (
                <div
                  key={i.id}
                  ref={(el) => { itemRefs.current[i.id] = el; }}
                  className={
                    `relative rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-col transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md ` +
                    (highlightId === i.id ? 'ring-2 ring-emerald-400' : '')
                  }
                >
                  {amAdmin && ((i as any).reportCount ?? 0) > 0 && (
                    <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40">
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 18H3L12 3z" fill="currentColor"/></svg>
                      <span className="tabular-nums">{(i as any).reportCount}</span>
                    </div>
                  )}
                  {/* LEFT TOP: Share + Options */}
                  <div className="rs-pop absolute top-3 right-3 z-20 flex flex-col gap-2">
                    {/* Share button + popover */}
                    <div className="relative">
                      <button
                        className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
                        aria-label="share"
                        onClick={() => setOpenShare(openShare === i.id ? null : i.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 3v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      {openShare === i.id && (
                        <div className="rs-pop absolute right-10 top-0 z-30 w-44 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1">
                          <button
                            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => { copyShareLink(i.id); setOpenShare(null); }}
                          >
                            Kopyala
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => { nativeShare(i.id, i.name); setOpenShare(null); }}
                          >
                            Daha fazla seçenek
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Options button + menu */}
                    <div className="relative">
                      <button
                        className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
                        onClick={() => setOpenMenu(openMenu === i.id ? null : i.id)}
                        aria-label="options"
                      >
                        ⋯
                      </button>
                    {openMenu === i.id && (
                      <div className="rs-pop absolute right-10 top-0 z-30 w-56 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1">
                        {amAdmin && (
                          <>
                            <button
                              className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              onClick={() => { setOpenMenu(null); deleteItem(i.id); }}
                            >Kaldır</button>
                            <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
                          </>
                        )}
                        <button
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            isSaved
                              ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          onClick={() => toggleSave(i.id)}
                        >
                          {isSaved ? 'Kaydedilenlerden Kaldır' : 'Kaydet'}
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          onClick={() => { setOpenMenu(null); report(i.id); }}
                        >
                          Report
                        </button>
                      </div>
                    )}
                    </div>
                  </div>

                  {/* İÇERİK */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center shrink-0 w-28">
                        {i.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => openSpotlight(i.id)}
                            className="rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            aria-label={`${i.name} spotlight'ı aç`}
                            title={`${i.name} spotlight'ı aç`}
                          >
                            <img  src={i.imageUrl || '/default-item.svg'}
    alt={i.name || 'item'} className="w-28 h-28 object-cover rounded-lg" />
                          </button>
                        ) : (
                          <button
  type="button"
  onClick={() => openSpotlight(i.id)}
  className="rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
  aria-label={`${i.name} spotlight'ı aç`}
  title={`${i.name} spotlight'ı aç`}
>
  <img
    src={i.imageUrl || '/default-item.svg'}
    alt={i.name || 'item'}
    className="w-28 h-28 object-cover rounded-lg"
  />
</button>
                        )}
                        {i.edited && (
                          <span className="text-[11px] px-2 py-0.5 mt-1 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">
                            düzenlendi
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium leading-tight pr-16 md:pr-24 title-wrap md-clamp2" title={i.name} lang="tr">
                          <button
                            type="button"
                            onClick={() => openSpotlight(i.id)}
                            className="text-left hover:underline underline-offset-2 decoration-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded"
                            aria-label={`${i.name} spotlight'ı aç`}
                            title={`${i.name} spotlight'ı aç`}
                          >
                            {i.name}
                          </button>
                        </h3>
                        <p className="text-sm opacity-80 mt-1 break-words">{i.description}</p>

                        {i.createdBy && (
                          <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                            {i.createdBy.avatarUrl ? (
                              <img
                                src={i.createdBy.avatarUrl}
                                alt={((i.createdBy as any)?.verified ? i.createdBy.name : maskName(i.createdBy.name)) || 'u'}
                                className="w-5 h-5 rounded-full object-cover"
                                title={((i.createdBy as any)?.verified ? i.createdBy.name : maskName(i.createdBy.name)) || 'u'}
                              />
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px]"
                                title={((i.createdBy as any)?.verified ? i.createdBy.name : maskName(i.createdBy.name)) || 'u'}
                              >
                                {( ((i.createdBy as any)?.verified ? i.createdBy.name : maskName(i.createdBy.name)) || 'u' ).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>
                              {(i.createdBy as any)?.verified ? (i.createdBy.name || 'Anonim') : maskName(i.createdBy.name)}
                            </span>
                            {(i.createdBy as any)?.verified && (
                              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-4 h-4 align-middle">
                                <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                                <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        )}

                        {/* Tek satır: Ortalama yıldızlar + adet (ufak pill) */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {/* Ortalama yıldızlar (display only) */}
                          <Stars rating={i.avgRating ?? i.avg ?? 0} readOnly />
                          {/* Ortalama + adet (ufak pill) */}
                          <RatingPill avg={i.avgRating ?? i.avg} count={i.count} />
                        </div>

                        
                      </div>
                    </div>

                    {i.tags.length > 0 && (
                      <div className="mt-2 pt-2 border-t dark:border-gray-800">
                        <div className="w-full flex flex-wrap items-center gap-1 justify-start">
                          {i.tags.slice(0, 10).map((t) => (
                            <Tag
                              key={t}
                              label={t}
                              className="inline-flex"
                              active={selectedTags.has(t)}
                              onClick={() => {
                                setSelectedTags(prev => {
                                  const next = new Set(prev);
                                  if (next.has(t)) next.delete(t); else next.add(t);
                                  return next;
                                });
                              }}
                              onDoubleClick={() => setSelectedTags(new Set())}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {(i.comments?.length ?? 0) > 0 && <div className="mt-3 border-t dark:border-gray-800" />}
{i.comments?.length > 0 && (
  (() => {
    const my = myId ? i.comments.find(c => c.user?.id === myId) : null;
    const othersAll = i.comments.filter(c => c.id !== (my?.id || ''));
    const displayOthers = othersAll.slice(0, 3);
    const hasMore = othersAll.length > 3;

    return (
      <div className="pt-3 space-y-2 text-sm leading-relaxed">
        {/* Başkalarının yorumları */}
        {displayOthers.map((c) => {
          const isEditing =
  editingCommentId === c.id && editingCommentItem === i.id;
          return (
            <div key={c.id} className="flex items-start gap-2 justify-between">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                {c.user?.avatarUrl ? (
                  <img src={c.user.avatarUrl} alt={maskName(c.user?.name)} className="w-5 h-5 rounded-full object-cover mt-0.5" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] mt-0.5">
                    {(maskName(c.user?.name) || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs opacity-70 flex items-center">
                    {((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name))}
                    {(c.user as any)?.verified && (
                      <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block ml-1 w-4 h-4 align-middle">
                        <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                        <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {c.rating ? (
                      <span className="ml-1 inline-block bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">{c.rating}★</span>
                    ) : null}
                    {/* VOTE CONTROLS */}
                    <span className="ml-2 inline-flex items-center gap-1 select-none">
                      <button
                        type="button"
                        className={`px-1 py-0.5 rounded ${c.myVote === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Upvote"
                        onClick={() => voteOnComment(c.id, c.myVote === 1 ? 0 : 1)}
                      >▲</button>
                      <span className="tabular-nums text-xs opacity-80">{typeof c.score === 'number' ? c.score : 0}</span>
                      <button
                        type="button"
                        className={`px-1 py-0.5 rounded ${c.myVote === -1 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Downvote"
                        onClick={() => voteOnComment(c.id, c.myVote === -1 ? 0 : -1)}
                      >▼</button>
                    </span>
                  </div>

                  {(() => {
                    const isOpen = expandedComments.has(c.id);
                    const isTrunc = truncatedComments.has(c.id);
                    const longish = (c.text || '').length >= 60;

                    if (isOpen) {
                      return (
                        <div className="w-full">
                          <div className="whitespace-pre-wrap break-words">“{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}</div>
                          {(isTrunc || longish) && (
                            <button
                              type="button"
                              className="mt-1 text-[11px] underline opacity-70 hover:opacity-100"
                              onClick={() => setExpandedComments(p => { const n=new Set(p); n.delete(c.id); return n; })}
                            >daha az</button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="w-full flex items-baseline gap-1 min-w-0">
                        <div
                          ref={(el) => { commentTextRefs.current[c.id] = el; if (el) setTimeout(() => measureTruncation(c.id), 0); }}
                          className="truncate w-full"
                        >
                          “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                        </div>
                        {(isTrunc || longish) && (
                          <button
                            type="button"
                            className="shrink-0 text-[11px] underline opacity-70 hover:opacity-100"
                            onClick={() => setExpandedComments(p => new Set(p).add(c.id))}
                          >devamını gör</button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              {!isEditing && null}
            </div>
          );
        })}

        {hasMore && (
          <div className="pt-1">
            <button
              type="button"
              className="text-[12px] underline opacity-75 hover:opacity-100"
              onClick={() => openSpotlight(i.id)}
            >
              hepsini gör
            </button>
          </div>
        )}

        {/* Senin yorumun – en altta, highlight’lı */}
        {my && (() => {
          const c = my;
          const isEditing =
  editingCommentId === c.id && editingCommentItem === i.id;
          return (
            <div key={c.id} className="flex items-start gap-2 justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-900/20 p-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                {c.user?.avatarUrl ? (
                  <img src={c.user.avatarUrl} alt={maskName(c.user?.name)} className="w-5 h-5 rounded-full object-cover mt-0.5" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] mt-0.5">
                    {(maskName(c.user?.name) || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs opacity-70 flex items-center">
                    Senin yorumun
                    {c.rating ? (
                      <span className="ml-2 inline-block bg-emerald-200 text-emerald-900 text-[11px] px-2 py-0.5 rounded-full">{c.rating}★</span>
                    ) : null}
                  </div>

                  {!isEditing ? (
                    (() => {
                      const isOpen = expandedComments.has(c.id);
                      const isTrunc = truncatedComments.has(c.id);
                      const longish = (c.text || '').length >= 60;

                      if (isOpen) {
                        return (
                          <div className="w-full">
                            <div className="whitespace-pre-wrap break-words">“{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}</div>
                            {(isTrunc || longish) && (
                              <button
                                type="button"
                                className="mt-1 text-[11px] underline opacity-70 hover:opacity-100"
                                onClick={() => setExpandedComments(p => { const n=new Set(p); n.delete(c.id); return n; })}
                              >daha az</button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="w-full flex items-baseline gap-1 min-w-0">
                          <div
                            ref={(el) => { commentTextRefs.current[c.id] = el; if (el) setTimeout(() => measureTruncation(c.id), 0); }}
                            className="truncate w-full"
                          >
                            “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                          </div>
                          {(isTrunc || longish) && (
                            <button
                              type="button"
                              className="shrink-0 text-[11px] underline opacity-70 hover:opacity-100"
                              onClick={() => setExpandedComments(p => new Set(p).add(c.id))}
                            >devamını gör</button>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-70">Puanın<span className="text-red-500">*</span>:</span>
                        <Stars rating={editingCommentRating} onRatingChange={setEditingCommentRating} size="sm" />
                      </div>
                      <textarea
                        className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                        rows={3}
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2.5 py-1.5 rounded-lg border text-xs bg-black text-white disabled:opacity-50"
                          onClick={async () => {
                            if (!editingCommentRating) return;
                            const ok = await updateComment(c.id, editingCommentText, i.id, editingCommentRating);
                            if (ok) {
                              setEditingCommentId(null);
                              setEditingCommentItem(null);
                              setEditingCommentText('');
                              setEditingCommentRating(0);
                            }
                          }}
                          disabled={!editingCommentRating}
                        >Kaydet</button>
                        <button
                          className="px-2.5 py-1.5 rounded-lg border text-xs"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingCommentItem(null);
                            setEditingCommentText('');
                            setEditingCommentRating(0);
                          }}
                        >Vazgeç</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {!isEditing && (
  <div className="flex items-center gap-2 shrink-0">
    <span className="shrink-0 inline-flex items-center gap-1 select-none" aria-label="Yorum puanı">
      <span className="px-1 py-0.5 rounded pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800" title="Upvote">▲</span>
      <span className="tabular-nums text-xs opacity-80">{typeof c.score === 'number' ? c.score : 0}</span>
      <span className="px-1 py-0.5 rounded pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800" title="Downvote">▼</span>
    </span>
   
    <button
      className={`p-1.5 rounded-md ${confirmDeleteId === c.id ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'}`}
      title={confirmDeleteId === c.id ? 'Silmek için tekrar tıkla' : 'Yorumu sil'}
      onClick={() => {
        if (confirmDeleteId !== c.id) {
          setConfirmDeleteId(c.id);
          return;
        }
        deleteComment(c.id);
      }}
    >
      {confirmDeleteId === c.id ? (
        // check icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        // trash icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      )}
    </button>
  </div>
)}
            </div>
          );
        })()}
      </div>
    );
  })()
)}
                  </div>

                  {/* Yorum yaz (tek yorum kuralı) */}
                  {!(i as any).myCommentId && (
                    <div className="mt-3 pt-3 border-t dark:border-gray-800">
                      <CommentBox
                        itemId={i.id}
                        onDone={async () => {
                          await load();
                          if (sharedId && i.id === sharedId) await refreshShared(i.id);
                        }}
                        initialRating={0}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}