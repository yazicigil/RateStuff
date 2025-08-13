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

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Tag from '@/components/Tag';
import Stars from '@/components/Stars';
import Header from '@/components/Header';
import CollapsibleSection from '@/components/CollapsibleSection';
import ImageUploader from '@/components/ImageUploader';
import CommentBox from '@/components/CommentBox';
import { useSession } from 'next-auth/react';

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
    edited?: boolean;
    user?: { id?: string; name?: string | null; avatarUrl?: string | null; verified?: boolean };
  }[];
  tags: string[];
  reportCount?: number;
};


export default function HomePage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [order, setOrder] = useState<'new' | 'top'>('new');
  const [items, setItems] = useState<ItemVM[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
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
  // Çoklu etiket seçimi için state
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  // Yorumlarda "devamını gör" için açılanlar
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  // Yorumlarda gerçek (görsel) truncation tespiti için
  const [truncatedComments, setTruncatedComments] = useState<Set<string>>(new Set());
  const commentTextRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
      if (url.searchParams.has('item')) {
        url.searchParams.delete('item');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
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
      if (q.trim()) qs.set('q', q.trim());
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
      const id = u.searchParams.get('item');
      setSharedId(id);
    } catch {}
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
    const t = setTimeout(() => { load(); }, 250);
    return () => clearTimeout(t);
  }, [q, order]);

  // Kaldırıldı: activeTag ve single-tag selection, çoklu seçim state'e taşındı

  // Yıldız filtresi: ortalama 3.67 → 4 yıldız kovasına girer
  function bucketOf(avg: number | null): number | null {
    if (!avg || avg <= 0) return null;
    return Math.ceil(avg);
  }

  // Filtreleme: yıldız ve çoklu etiket seçimi
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
    return filtered;
  }, [items, starBuckets, selectedTags]);

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
        setQ('');
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
    } else {
      alert('Hata: ' + (j?.error || `${res.status} ${res.statusText}`));
    }
  }

  async function updateComment(commentId: string, text: string, itemId?: string, rating?: number) {
    // 1) /api/comments/:id (çoğul) → PATCH
    let res = await fetchOrSignin(`/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, rating })
    });
    if (res && res.ok) { await load(); return true; }

    // 2) Yedek rota: /api/items/:itemId/comments → PATCH (commentId + text)
    if (itemId) {
      res = await fetchOrSignin(`/api/items/${itemId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: commentId, text, rating })
      });
      if (res && res.ok) { await load(); return true; }
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
    const name = q.trim();
    if (name) setQuickName(name);
    // scroll & focus
    quickSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      quickNameRef.current?.focus();
      quickNameRef.current?.select();
    }, 250);
    // visual cue
    setPulseQuick(true);
    setTimeout(() => setPulseQuick(false), 900);
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
  function scrollToItem(id: string) {
    const el = itemRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const clamp2: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
  };

  const quickFormRef = useRef<HTMLFormElement>(null);
  const quickValid = quickName.trim().length > 0 && quickTags.length > 0 && newRating > 0;

  function normalizeTag(s: string) {
    return s.trim().replace(/^#+/, '').toLowerCase();
  }
  function addTagsFromInput(src?: string) {
    const raw = typeof src === 'string' ? src : quickTagInput;
    const parts = raw.split(',').map(normalizeTag).filter(Boolean);
    if (parts.length === 0) return;
    setQuickTags(prev => {
      const set = new Set(prev);
      for (const p of parts) {
        if (set.size >= 3) break; // cap at 3
        set.add(p);
      }
      return Array.from(set).slice(0,3);
    });
    setQuickTagInput('');
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Header controls={{ q, onQ: setQ, order, onOrder: setOrder, starBuckets: Array.from(starBuckets), onStarBuckets: (arr)=>setStarBuckets(new Set(arr)) }} />
      <style jsx global>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-4px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Sol: etiketler */}
        <aside>
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
        </aside>

        {/* Sağ: listeler */}
        <section className="space-y-4">
          
          {/* Paylaşımdan gelen tek öğe (spotlight) */}
          {sharedItem && (
  <div className={
    `relative rounded-2xl border p-4 shadow-sm bg-emerald-50/70 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/40 flex flex-col transition-transform duration-150`
  }>
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

    {/* CONTENT */}
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0 w-28">
        {sharedItem.imageUrl ? (
          <img src={sharedItem.imageUrl} alt={sharedItem.name} className="w-28 h-28 object-cover rounded-lg" />
        ) : (
          <div className="w-28 h-28 rounded-lg bg-white/5 grid place-items-center text-xs opacity-60 dark:bg-gray-800">no img</div>
        )}
        {sharedItem.edited && (
          <span className="text-[11px] px-2 py-0.5 mt-1 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">düzenlendi</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-base md:text-lg font-semibold leading-snug" style={clamp2} title={sharedItem.name}>
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
          {/* Ortalama + adet (ufak pill) */}
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <span aria-hidden="true" className="leading-none">⭐</span>
            <span className="tabular-nums">{sharedItem.avg ? sharedItem.avg.toFixed(2) : '—'}</span>
            <span className="opacity-60 tabular-nums">({sharedItem.count})</span>
          </span>
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
      <div className="pt-3 space-y-2 text-sm leading-relaxed">
        {sharedItem.comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2 min-w-0">
            {c.user?.avatarUrl ? (
              <img
                src={c.user.avatarUrl}
                alt={(((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)) || 'user')}
                className="w-5 h-5 rounded-full object-cover mt-0.5"
                title={(((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)) || 'user')}
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] mt-0.5"
                title={(((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)) || 'user')}
              >
                {( (((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)) || 'user').charAt(0).toUpperCase() )}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs opacity-70 flex items-center">
                {(c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)}
                {(c.user as any)?.verified && (
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-4 h-4 align-middle">
                    <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                    <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {c.rating ? (
                  <span className="ml-1 inline-block bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                    {c.rating}★
                  </span>
                ) : null}
              </div>
              {(() => {
                const isOpen = expandedComments.has(c.id);
                const isTrunc = truncatedComments.has(c.id);
                const longish = (c.text || '').length >= 60;

                if (isOpen) {
                  return (
                    <div className="w-full">
                      <div className="whitespace-pre-wrap break-words">
                        “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                      </div>
                      {(isTrunc || longish) && (
                        <button
                          type="button"
                          className="mt-1 text-[11px] underline opacity-70 hover:opacity-100"
                          onClick={() =>
                            setExpandedComments((prev) => {
                              const n = new Set(prev); n.delete(c.id); return n;
                            })
                          }
                        >daha az</button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="w-full flex items-baseline gap-1 min-w-0">
                    <div
                      ref={(el) => {
                        commentTextRefs.current[c.id] = el;
                        if (el) setTimeout(() => measureTruncation(c.id), 0);
                      }}
                      className="truncate w-full"
                    >
                      “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                    </div>
                    {(isTrunc || longish) && (
                      <button
                        type="button"
                        className="shrink-0 text-[11px] underline opacity-70 hover:opacity-100"
                        onClick={() => setExpandedComments((prev) => new Set(prev).add(c.id))}
                      >devamını gör</button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
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
  )}
          {/* Hızlı ekleme */}
          <div ref={quickSectionRef} className={pulseQuick ? 'ring-2 ring-emerald-400 rounded-2xl transition' : ''}>
            <CollapsibleSection
              title="Eklemek istediğin bir şey mi var?"
              defaultOpen={true}
            >
              <form
                ref={quickFormRef}
                className="relative rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 space-y-3"
                onSubmit={async (e) => {
  e.preventDefault();
  const formEl = e.currentTarget;
  const fd = new FormData(formEl);

  // name*, en az 1 etiket*, rating*
  const nameVal = String(fd.get('name') || '').trim();
  if (!nameVal) { alert('Ad gerekli'); return; }
  if (quickTags.length === 0) { alert('En az bir etiket eklemelisin'); return; }
  if (!newRating || newRating < 1) { alert('Puan seçmelisin'); return; }

  const ok = await addItem(fd);
  if (ok) {
    // Formu tamamen temizle
    quickFormRef.current?.reset();
    setQuickName('');
    setNewRating(0);
    setNewImage(null);
    setQuickTags([]);
    setQuickTagInput('');
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
                {/* 1. satır: Ad + Kısa açıklama */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={quickNameRef}
                    name="name"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="adı *"
                    required
                  />
                 <input
  name="desc"
  className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
  placeholder="kısa açıklama (opsiyonel)"
/>
                  <div className="flex-1 min-w-[200px]">
                   <div className="text-xs opacity-70 mb-1">
  Etiketler <span className="text-red-500">*</span>
</div>
                    <div className="border rounded-xl px-2 py-1.5 flex flex-wrap gap-1 focus-within:ring-2 focus-within:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700">
                      {quickTags.map(t => (
                        <span
                          key={t}
                          className={
                            (trending.includes(t)
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600') +
                            ' inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border'
                          }
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
                        placeholder={quickTags.length >= 3 ? 'En fazla 3 etiket' : (quickTags.length ? '' : 'etiketler (virgülle)')}
                        className="flex-1 min-w-[120px] px-2 py-1 text-sm bg-transparent outline-none"
                        disabled={quickTags.length >= 3}
                      />
                    </div>
                    {/* hidden: backend "tagsCsv" için */}
                    <input type="hidden" name="tags" value={quickTags.join(',')} />
                  </div>
                </div>

                {/* 2. satır: Yıldız seçimi + Yorum */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70">Puanın<span className="text-red-500">*</span>:</span>
                    <Stars value={newRating} onRate={(n) => setNewRating(n)} />
                  </div>
                  {/* hidden: addItem tarafına rating’i geçelim */}
                  <input type="hidden" name="rating" value={newRating} />
                  <input
                    name="comment"
                    className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="yorum (opsiyonel)"
                  />
                </div>

                {/* 3. satır: Resim ekle (başlığın altında derli toplu) */}
                <div>
                  <div className="text-sm font-medium mb-2">Resim ekle (opsiyonel)</div>
                  <ImageUploader value={newImage} onChange={setNewImage} />
                  {/* hidden: addItem tarafına url’i geçelim */}
                  <input type="hidden" name="imageUrl" value={newImage ?? ''} />
                </div>

                {/* 4. satır: Buton sağda ve biraz büyük */}
                <div className="flex justify-end pt-1">
                  <button
                    disabled={adding}
                    className="px-4 py-2.5 rounded-xl text-sm md:text-base bg-black text-white disabled:opacity-60 transition-colors"
                  >
                    {adding ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none"/></svg>
                        Ekleniyor…
                      </span>
                    ) : (
                      'Ekle'
                    )}
                  </button>
                </div>
              </form>
            </CollapsibleSection></div>

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

         {!loading
  && loadedOnce
  && filteredItems.length === 0
  && (q.trim().length > 0 || starBuckets.size > 0 || selectedTags.size > 0 || items.length === 0)
  && (
            <div className="rounded-2xl border p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 p-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" opacity="0.5"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2"/></svg>
                </div>
                <div>
                  <div className="font-medium">Hiç sonuç yok.</div>
                  <div className="text-sm opacity-80">Eklemek ister misin?</div>
                </div>
              </div>
              <button
                onClick={jumpToQuickAdd}
                className="px-3 py-2 rounded-xl text-sm bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
              >
                Hızlı Ekle
              </button>
            </div>
          )}

          {/* KART IZGARASI */}
          <div className="grid md:grid-cols-2 gap-4">
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
                          <img src={i.imageUrl} alt={i.name} className="w-28 h-28 object-cover rounded-lg" />
                        ) : (
                          <div className="w-28 h-28 rounded-lg bg-white/5 grid place-items-center text-xs opacity-60 dark:bg-gray-800">no img</div>
                        )}
                        {i.edited && (
                          <span className="text-[11px] px-2 py-0.5 mt-1 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">
                            düzenlendi
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-semibold leading-snug" style={clamp2} title={i.name}>
                          {i.name}
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
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            <span aria-hidden="true" className="leading-none">⭐</span>
                            <span className="tabular-nums">{i.avg ? i.avg.toFixed(2) : '—'}</span>
                            <span className="opacity-60 tabular-nums">({i.count})</span>
                          </span>
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
                      <div className="pt-3 space-y-2 text-sm leading-relaxed">
                    {i.comments.map((c) => {
                      const isMine = myId && c.user?.id === myId;
                      const isEditing = editingCommentId === c.id;

                      return (
                        <div key={c.id} className="flex items-start gap-2 justify-between">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            {c.user?.avatarUrl ? (
                              <img
                                src={c.user.avatarUrl}
                                alt={(((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)) || 'user')}
                                className="w-5 h-5 rounded-full object-cover mt-0.5"
                                title={(((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)) || 'user')}
                              />
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] mt-0.5"
                                title={(((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)) || 'user')}
                              >
                                {( (((c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)) || 'user').charAt(0).toUpperCase() )}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="text-xs opacity-70 flex items-center">
                                {(c.user as any)?.verified ? (c.user?.name || 'Anonim') : maskName(c.user?.name)}
                                {(c.user as any)?.verified && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-4 h-4 align-middle">
                                    <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                                    <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                                {c.rating ? (
                                  <span className="ml-1 inline-block bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                                    {c.rating}★
                                  </span>
                                ) : null}
                              </div>

                              {/* Görünüm / Düzenleme */}
                              {!isEditing ? (
                                (() => {
                                  const isOpen = expandedComments.has(c.id);
                                  const isTrunc = truncatedComments.has(c.id);
                                  const longish = (c.text || '').length >= 60;

                                  if (isOpen) {
                                    return (
                                      <div className="w-full">
                                        <div className="whitespace-pre-wrap break-words">
                                          “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                                        </div>
                                        {(isTrunc || longish) && (
                                          <button
                                            type="button"
                                            className="mt-1 text-[11px] underline opacity-70 hover:opacity-100"
                                            onClick={() =>
                                              setExpandedComments((prev) => {
                                                const n = new Set(prev); n.delete(c.id); return n;
                                              })
                                            }
                                          >daha az</button>
                                        )}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="w-full flex items-baseline gap-1 min-w-0">
                                      <div
                                        ref={(el) => {
                                          commentTextRefs.current[c.id] = el;
                                          if (el) setTimeout(() => measureTruncation(c.id), 0);
                                        }}
                                        className="truncate w-full"
                                      >
                                        “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
                                      </div>
                                      {(isTrunc || longish) && (
                                        <button
                                          type="button"
                                          className="shrink-0 text-[11px] underline opacity-70 hover:opacity-100"
                                          onClick={() => setExpandedComments((prev) => new Set(prev).add(c.id))}
                                        >devamını gör</button>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                (
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
                                      >
                                        Kaydet
                                      </button>
                                      <button
                                        className="px-2.5 py-1.5 rounded-lg border text-xs"
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditingCommentItem(null);
                                          setEditingCommentText('');
                                          setEditingCommentRating(0);
                                        }}
                                      >
                                        Vazgeç
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {/* Sadece kendi yorumlarım veya admin: kalem + çöp */}
                          {(isMine || amAdmin) && !isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                title="Yorumu düzenle"
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditingCommentItem(i.id);
                                  setEditingCommentText(c.text);
                                  setEditingCommentRating(c.rating || 0);
                                }}
                              >
                                {/* Pencil icon */}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.6" fill="currentColor" />
                                  <path d="M14.06 4.94l3.75 3.75 1.44-1.44a2.12 2.12 0 0 0 0-3l-0.75-0.75a2.12 2.12 0 0 0-3 0l-1.44 1.44z" stroke="currentColor" strokeWidth="1.6" fill="currentColor" />
                                </svg>
                              </button>
                              <button
                                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                title="Yorumu sil"
                                onClick={() => deleteComment(c.id)}
                              >
                                {/* Trash icon */}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                      </div>
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