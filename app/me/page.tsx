'use client';
import React from "react";

import Link from "next/link";
import ScrollToTop from "@/components/common/ScrollToTop";
import { useEffect, useMemo, useState } from "react";
import { useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import ImageUploader from "@/components/common/ImageUploader";
import { useSession } from "next-auth/react";
import RatingPill from '@/components/common/RatingPill';
import Stars from "@/components/common/Stars";
import NotificationsDropdown from "@/components/header/notifications/Dropdown";
import SavedTab from '@/components/me/SavedTab';
import ItemsTab from '@/components/me/ItemsTab';
import CommentsTab from '@/components/me/CommentsTab';


// Banned words (supports either default export or named `bannedWords`)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as bannedModule from "@/lib/bannedWords";
const BANNED_LIST: string[] = (bannedModule as any)?.bannedWords || (bannedModule as any)?.default || [];

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 3.75A2.25 2.25 0 0 1 11.25 1.5h1.5A2.25 2.25 0 0 1 15 3.75V4.5h3.75a.75.75 0 0 1 0 1.5h-.32l-1.07 13.393A3.75 3.75 0 0 1 13.62 23.25H10.38a3.75 3.75 0 0 1-3.74-3.857L5.57 6H5.25a.75.75 0 0 1 0-1.5H9V3.75Zm1.5.75h3V3.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V4.5Z"/>
      <path d="M8.069 6l1.06 13.268a2.25 2.25 0 0 0 2.25 2.082h1.242a2.25 2.25 0 0 0 2.25-2.082L15.931 6H8.069Z"/>
    </svg>
  );
}
function IconPencil({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.862 3.487a1.875 1.875 0 0 1 2.651 2.651L8.9 16.75a4.5 4.5 0 0 1-1.897 1.128l-2.935.881a.75.75 0 0 1-.93-.93l.881-2.935A4.5 4.5 0 0 1 5.25 13.1L16.862 3.487Z"/>
      <path d="M18.225 8.401l-2.626-2.626 1.06-1.06a.375.375 0 0 1 .53 0l2.096 2.096a.375.375 0 0 1 0 .53l-1.06 1.06Z"/>
    </svg>
  );
}

function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
    </svg>
  );
}

function IconBookmarkMinus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.75 2.25A2.25 2.25 0 0 0 4.5 4.5v17.19a.56.56 0 0 0 .89.46l6.11-4.58 6.11 4.58a.56.56 0 0 0 .89-.46V4.5A2.25 2.25 0 0 0 16.25 2.25h-9.5Zm2 8a.75.75 0 0 1 0-1.5h6.5a.75.75 0 0 1 0 1.5h-6.5Z"/>
    </svg>
  );
}

type MyItem = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  avg: number | null;
  /** Ana sayfadaki mantıkla uyum için opsiyonel alan */
  avgRating?: number | null;
  count?: number; // toplam değerlendirme adedi
  edited?: boolean;
  suspended?: boolean;
  tags?: string[]; // saved filtre + kartlarda gösterim
  // Ekleyen kişi bilgisi (opsiyonel)
  createdBy?: {
    id: string;
    name?: string | null;
    maskedName?: string | null;
    avatarUrl?: string | null;
    kind?: "REGULAR" | "BRAND" | string | null;
  } | null;
  // Eski payloadlar için sade alanlar (fallback)
  createdByName?: string | null;
  createdByAvatarUrl?: string | null;
};
type MyRating  = { id: string; itemId: string; itemName: string; value: number };
type MyComment = {
  id: string;
  itemId: string;
  itemName: string;
  itemImageUrl?: string | null;
  text: string;
  edited?: boolean;
  rating?: number; // yorumu atarken verilen yıldız (Comment.rating)
  score?: number; // upvote sayacı (net skor)
};

// Spotlight deep link for an item
const spotlightHref = (id: string) => `/?item=${id}`;

// Build a single regex for banned words (case-insensitive, Unicode, word boundaries)
const makeBannedRegex = (list: string[]) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = list.filter(Boolean).map((w) => esc(w.trim())).filter(Boolean);
  if (parts.length === 0) return null;
  return new RegExp(`\\b(${parts.join("|")})\\b`, "iu");
};
const BANNED_RE = makeBannedRegex(BANNED_LIST);
const findBanned = (text: string | null | undefined): string | null => {
  if (!text || !BANNED_RE) return null;
  const m = text.match(BANNED_RE);
  return m ? m[0] : null;
};

/** — Ortalama okuma helper’ı: ana sayfadaki gibi avgRating ?? avg — */
const getAvg = (x: { avg?: number | null; avgRating?: number | null } | null | undefined) =>
  (x as any)?.avgRating ?? (x as any)?.avg ?? null;
// "iki kelime, tek etiket" -> ["iki kelime","tek etiket"]
function parseTagsInput(input: string): string[] {
  return Array.from(new Set(
    (input || "")
      .split(",")                      // sadece virgülle ayır
      .map(s => s.trim())               // baş/son boşlukları kırp
      .filter(Boolean)
      .map(s => s.replace(/^#\s*/, "")) // baştaki # (ve olası boşluk) kaldır
      .map(s => s.toLowerCase())
  ));
}
export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [me, setMe]           = useState<{ id:string; name?:string|null; avatarUrl?:string|null; email?: string|null; isAdmin?: boolean; kind?: "REGULAR" | "BRAND" | string | null }|null>(null);
  const [items, setItems]     = useState<MyItem[]>([]);
  const [saved, setSaved]     = useState<MyItem[]>([]);
  const [ratings, setRatings] = useState<MyRating[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
  // Trend etiketler
  const [trending, setTrending] = useState<string[]>([]);

  // Eklediklerimi düzenleme
  const [editingItem, setEditingItem] = useState<string|null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editImg,  setEditImg]  = useState<string|null>(null);
  const [editTags, setEditTags] = useState<string>(""); // ← EKLE
  // Profil foto düzenleme
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarTemp, setAvatarTemp] = useState<string | null>(null);
  useEffect(() => {
    setAvatarTemp(me?.avatarUrl ?? null);
  }, [me]);
  // Close avatar editor with ESC
  useEffect(() => {
    if (!editingAvatar) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingAvatar(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editingAvatar]);
  async function saveAvatar() {
    try {
      const r = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: avatarTemp ?? null }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `status ${r.status}`);
      setMe(prev => prev ? { ...prev, avatarUrl: avatarTemp ?? null } : prev);
      setEditingAvatar(false);
      notify('Profil fotoğrafı güncellendi');
    } catch (e: any) {
      alert('Hata: ' + (e?.message || e));
    }
  }

  // Eklediklerim filtre (çoklu tag seçimi)
  // Kaydedilenler filtre kaldırıldı, SavedTab yönetiyor.
  // Eklediklerim filtre (çoklu tag seçimi)
  const [itemsSelected, setItemsSelected] = useState<Set<string>>(new Set());

  // Yorumlar: kaç adet görünüyor
  const [commentsLimit, setCommentsLimit] = useState(5);

  // Aktif tab (Saved/Items/Comments)
  const [activeSection, setActiveSection] = useState<'saved' | 'items' | 'comments'>('saved');

  // toast
  const [toast, setToast] = useState<string | null>(null);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout((notify as any)._t);
    (notify as any)._t = window.setTimeout(() => setToast(null), 2200);
  }, []);

  // helper: smooth-scroll and toggle a section
  const jumpTo = useCallback((id: string) => {
    try {
      window.dispatchEvent(new CustomEvent('toggle-section', { detail: { id } }));
    } catch {}
    // wait a tick so Section can update, then smooth scroll
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }, []);

  // giriş kontrolü
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/signin";
    }
  }, [status]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (r.status === 401) {
        window.location.href = "/";
        return;
      }
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok || !data?.ok) throw new Error(data?.error || `status ${r.status}`);

      // Eğer kullanıcı BRAND ise bu sayfa yerine /brand/me'ye yönlendir
      try {
        const k = String(data?.me?.kind || "").toUpperCase();
        if (k === "BRAND") {
          window.location.href = "/brand/me";
          return;
        }
      } catch {}

      setMe(data.me || null);
      setItems(data.items || []);
      setSaved(data.saved || []);
      setRatings(data.ratings || []);
      setComments(data.comments || []);
      // Trend etiketleri yükle
      try {
        const t = await fetch('/api/tags/trending', { cache: 'no-store' })
          .then(r => r.json())
          .catch(() => []);
        if (Array.isArray(t)) setTrending(t as string[]);
      } catch {}
    } catch (e: any) {
      setError(`Hata: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);


  // Eklediklerim (items) içinde mevcut etiketler
  const itemsTags = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) (it.tags || []).forEach(t => s.add(t));
    return Array.from(s).sort();
  }, [items]);



  // Eklediklerim filtresi
  const filteredItems = useMemo(() => {
    if (itemsSelected.size === 0) return items;
    return items.filter(it => {
      const tags = new Set(it.tags || []);
      for (const t of itemsSelected) if (!tags.has(t)) return false;
      return true;
    });
  }, [items, itemsSelected]);

  async function saveItem(id: string) {
const body: any = {
   description: editDesc,
   imageUrl: editImg ?? null,
   tags: parseTagsInput(editTags),
 };
     const r = await fetch(`/api/items/${id}/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      setEditingItem(null);
      await load();
      notify('Güncellendi');
    } else alert("Hata: " + (j?.error || r.status));
  }


  async function saveComment(commentId: string, nextText: string) {
    const r = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: nextText }),
    });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      notify('Yorum güncellendi');
      await load();
    }
    else alert("Hata: " + (j?.error || r.status));
  }

  async function changeMyCommentRating(commentId: string, itemId: string, value: number) {
    // Optimistic update on comments (Comment.rating is the source of truth here)
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, rating: value } : c));

    // Try PATCH /api/comments/:id with { rating }
    const r = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: value }),
    });
    const j = await r.json().catch(() => null);
    if (!j?.ok) {
      alert("Hata: " + (j?.error || r.status));
      await load(); // rollback to server truth
    }
  }

  async function changeRating(itemId: string, value: number) {
    // Optimistic update
    setRatings(prev => {
      const idStr = String(itemId);
      let found = false;
      const next = prev.map(r => {
        if (String(r.itemId) === idStr) { found = true; return { ...r, value } as MyRating; }
        return r;
      });
      if (!found) next.unshift({ id: `local-${idStr}`, itemId: idStr, itemName: '', value } as MyRating);
      return next;
    });

    const r = await fetch(`/api/items/${itemId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const j = await r.json().catch(() => null);
    if (!j?.ok) {
      alert("Hata: " + (j?.error || r.status));
      await load(); // rollback
    }
  }

  async function deleteComment(commentId: string) {
    const r = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      notify('Yorum silindi');
    } else {
      alert("Hata: " + (j?.error || r.status));
    }
  }


  async function deleteItem(itemId: string) {
    // 1) Try native DELETE first
    let r = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    // 2) If the route doesn't allow DELETE (405) or isn't found (404), try a fallback endpoint
    if (r.status === 405 || r.status === 404) {
      r = await fetch(`/api/items/${itemId}/delete`, { method: "POST" });
    }
    let j: any = null;
    try { j = await r.json(); } catch {}
    if (r.ok && j?.ok !== false) {
      setItems(prev => prev.filter(x => x.id !== itemId));
      notify('Silindi');
    } else {
      alert('Hata: ' + (j?.error || `${r.status} ${r.statusText}`));
    }
  }

    // --- URL hash ⇄ tab sync ---
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const m = hash.match(/tab=([a-z]+)/i);
      const tab = (m && m[1]) ? m[1].toLowerCase() : null;
      if (tab === 'saved' || tab === 'items' || tab === 'comments') {
        setActiveSection(tab as typeof activeSection);
      }
    } catch {}
  }, []);
  useEffect(() => {
    function onHashChange() {
      try {
        const hash = window.location.hash || '';
        const m = hash.match(/tab=([a-z]+)/i);
        const tab = (m && m[1]) ? m[1].toLowerCase() : null;
        if (tab === 'saved' || tab === 'items' || tab === 'comments') {
          setActiveSection(tab as typeof activeSection);
        }
      } catch {}
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  // Whenever tab changes, reflect it in the URL hash (without scrolling)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.hash = `tab=${activeSection}`;
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }, [activeSection]);


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 overflow-x-hidden">
      {/* Header removed */}

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* ÜSTTE: Profil kartı */}
        <section className="relative rounded-2xl border p-5 shadow-sm bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-gray-900 dark:to-gray-900 dark:border-gray-800 flex items-center gap-4">
          <div className="relative">
            {me?.avatarUrl ? (
              <img src={me.avatarUrl} alt="me" loading="lazy" decoding="async" className="w-14 h-14 rounded-full object-cover ring-2 ring-violet-300 dark:ring-violet-700" />
            ) : (
              <span
                className="w-14 h-14 inline-grid place-items-center rounded-full bg-gray-300 text-white font-bold ring-2 ring-violet-300 dark:ring-violet-700"
                aria-hidden="true"
              >
                {(() => {
                  const name = me?.name || "RS";
                  const initials = name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(s => (s[0] || "").toUpperCase())
                    .join("") || "RS";
                  return initials;
                })()}
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditingAvatar(v => !v)}
              className="absolute -bottom-1 -right-1 p-1 rounded-md border bg-white/90 dark:bg-gray-900/90 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              title={editingAvatar ? 'Kapat' : 'Fotoğrafı düzenle'}
              aria-label="Profil fotoğrafını düzenle"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M16.862 3.487a1.875 1.875 0 0 1 2.651 2.651L8.9 16.75a4.5 4.5 0 0 1-1.897 1.128l-2.935.881a.75.75 0 0 1-.93-.93l.881-2.935A4.5 4.5 0 0 1 5.25 13.1L16.862 3.487Z"/>
                <path d="M18.225 8.401l-2.626-2.626 1.06-1.06a.375.375 0 0 1 .53 0l2.096 2.096a.375.375 0 0 1 0 .53l-1.06 1.06Z"/>
              </svg>
            </button>
            {editingAvatar && (
              <>
                {/* MOBILE: full-screen mini modal with overlay */}
                <div className="fixed inset-0 z-50 sm:hidden">
                  {/* backdrop */}
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/40"
                    aria-label="Kapat"
                    title="Kapat"
                    onClick={() => setEditingAvatar(false)}
                  />
                  {/* centered panel */}
                  <div
                    role="dialog"
                    aria-label="Profil fotoğrafını düzenle"
                    className="relative mx-4 my-16 rounded-2xl border bg-white/95 dark:bg-gray-900/95 dark:border-gray-800 shadow-2xl p-0 backdrop-blur-md"
                  >
                    {/* header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-800 rounded-t-2xl">
                      <div className="text-sm font-medium">Profil fotoğrafı</div>
                      <button
                        type="button"
                        onClick={() => setEditingAvatar(false)}
                        className="p-1 rounded-md border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10"
                        aria-label="Kapat"
                        title="Kapat"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                      </button>
                    </div>
                    {/* body */}
                    <div className="p-3 space-y-3">
                      <div className="text-xs opacity-70">
                        Kare görseller en iyi sonucu verir. Minimum 200×200 piksel önerilir.
                      </div>
                      <ImageUploader value={avatarTemp ?? null} onChange={setAvatarTemp} />
                      <div className="text-[11px] opacity-60">
                        JPG/PNG. İstersen boş bırakıp mevcut fotoğrafı kaldırabilirsin.
                      </div>
                    </div>
                    {/* footer */}
                    <div className="px-3 py-2.5 border-t border-gray-200 dark:border-gray-800 rounded-b-2xl flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setAvatarTemp(me?.avatarUrl ?? null); setEditingAvatar(false); }}
                        className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={saveAvatar}
                        disabled={(avatarTemp ?? null) === (me?.avatarUrl ?? null)}
                        className={`px-3 py-1.5 rounded-lg border text-sm ${ (avatarTemp ?? null) === (me?.avatarUrl ?? null) ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-black text-white' }`}
                        title={(avatarTemp ?? null) === (me?.avatarUrl ?? null) ? 'Değişiklik yok' : 'Kaydet'}
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                </div>

                {/* DESKTOP (sm+): anchored popover */}
                <div
                  role="dialog"
                  aria-label="Profil fotoğrafını düzenle"
                  className="hidden sm:block absolute z-20 mt-2 left-0 top-full w-72 sm:w-80 rounded-2xl border bg-white/95 dark:bg-gray-900/95 dark:border-gray-800 shadow-xl p-0 backdrop-blur-md"
                >
                  {/* small pointer */}
                  <div className="absolute -top-2 left-6 h-4 w-4 rotate-45 bg-white/95 dark:bg-gray-900/95 border-l border-t dark:border-gray-800" />
                  {/* header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-800 rounded-t-2xl">
                    <div className="text-sm font-medium">Profil fotoğrafı</div>
                    <button
                      type="button"
                      onClick={() => setEditingAvatar(false)}
                      className="p-1 rounded-md border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10"
                      aria-label="Kapat"
                      title="Kapat"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                  </div>
                  {/* body */}
                  <div className="p-3 space-y-3">
                    <div className="text-xs opacity-70">
                      Kare görseller en iyi sonucu verir. Minimum 200×200 piksel önerilir.
                    </div>
                    <ImageUploader value={avatarTemp ?? null} onChange={setAvatarTemp} />
                    <div className="text-[11px] opacity-60">
                      JPG/PNG. İstersen boş bırakıp mevcut fotoğrafı kaldırabilirsin.
                    </div>
                  </div>
                  {/* footer */}
                  <div className="px-3 py-2.5 border-t border-gray-200 dark:border-gray-800 rounded-b-2xl flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setAvatarTemp(me?.avatarUrl ?? null); setEditingAvatar(false); }}
                      className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={saveAvatar}
                      disabled={(avatarTemp ?? null) === (me?.avatarUrl ?? null)}
                      className={`px-3 py-1.5 rounded-lg border text-sm ${ (avatarTemp ?? null) === (me?.avatarUrl ?? null) ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-black text-white' }`}
                      title={(avatarTemp ?? null) === (me?.avatarUrl ?? null) ? 'Değişiklik yok' : 'Kaydet'}
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base md:text-lg font-semibold truncate flex items-center gap-1">
              {me?.name || "Profilim"}
              {(
                ((me as any)?.isAdmin) ||
                ((me as any)?.email === "ratestuffnet@gmail.com") ||
                (String((me as any)?.kind || "").toUpperCase() === "BRAND")
              ) && (
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-4 h-4 align-middle">
                  <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                  <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className="text-xs opacity-70">Bu sayfayı yalnızca sen görebilirsin</div>
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label="Çıkış yap"
                title="Çıkış yap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h6a1.5 1.5 0 011.5 1.5V8h-2V5H5v10h5v-3h2v3.5a1.5 1.5 0 01-1.5 1.5h-6A1.5 1.5 0 013 15.5v-11zM14.793 7.793a1 1 0 011.414 0L19 10.586l-2.793 2.793a1 1 0 01-1.414-1.414L15.586 11H9v-2h6.586l-1.793-1.793a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Stat kartları = TABLAR */}
        <nav className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3">
          {[
            { id: 'saved' as const,    label: 'Kaydedilenler', count: saved.length },
            { id: 'items' as const,    label: 'Eklediklerim',  count: items.length },
            { id: 'comments' as const, label: 'Değerlendirmelerim',    count: comments.length },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                // üstteki tab alanına kaydır
                const el = document.getElementById('tabs-top');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`group w-full rounded-xl border py-2 px-3 sm:py-3 sm:px-4 text-left hover:shadow-md hover:-translate-y-0.5 transition shadow-sm
                ${activeSection === s.id
                  ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:border-violet-500'
                  : 'bg-white dark:bg-gray-900 dark:border-gray-800'}`}
            >
              <div className="text-xs opacity-60">{s.label}</div>
              <div className="mt-1 inline-flex items-center gap-2">
                <span className="text-base sm:text-xl font-semibold">{s.count}</span>
              </div>
            </button>
          ))}
        </nav>
        <div id="tabs-top" />

        {/* TAB PANELLERİ */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* SAVED */}
        {activeSection === 'saved' && (
          <SavedTab
            saved={saved}
            trending={trending}
            loading={loading}
            error={error}
            onNotify={notify}
            onSavedChange={(next) => setSaved(next)}
          />
        )}

        {/* ITEMS */}
        {activeSection === 'items' && (
          <ItemsTab
            items={items}
            trending={trending}
            loading={loading}
            notify={notify}
            onReload={load}
            myId={me?.id ?? null}
            amAdmin={Boolean((me as any)?.isAdmin || (me as any)?.email === 'ratestuffnet@gmail.com')}
          />
        )}


        {/* COMMENTS */}
        {activeSection === 'comments' && (
          <CommentsTab
            comments={comments}
            loading={loading}
            notify={notify}
            onReload={load}
          />
        )}
      </main>
      {toast && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <div className="rounded-xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg px-4 py-2 text-sm">
            {toast}
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeSlideIn {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-in {
          animation: fadeSlideIn 220ms ease-out both;
        }
      `}</style>
      <ScrollToTop />
    </div>
  );
}

/* — Collapsible Section (+/- ikonlu) — */
function Section({
  id,
  title,
  defaultOpen = false,
  children,
}: { id?: string; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  // Listen for global open-section and toggle-section events
  useEffect(() => {
    function onOpen(e: any) {
      if (e?.detail?.id && e.detail.id === id) setOpen(true);
    }
    function onToggle(e: any) {
      if (e?.detail?.id && e.detail.id === id) setOpen((o) => !o);
    }
    window.addEventListener('open-section', onOpen as any);
    window.addEventListener('toggle-section', onToggle as any);
    return () => {
      window.removeEventListener('open-section', onOpen as any);
      window.removeEventListener('toggle-section', onToggle as any);
    };
  }, [id]);
  useEffect(() => {
    if (!id) return;
    try {
      window.dispatchEvent(new CustomEvent('section-changed', { detail: { id, open } }));
    } catch {}
  }, [id, open]);
  return (
    <section id={id} className="rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full cursor-pointer select-none px-4 py-3 text-lg font-semibold flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/60 backdrop-blur border-b dark:border-gray-800 hover:bg-gray-100/70 dark:hover:bg-gray-800/80 transition"
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border dark:border-gray-700 text-xs leading-none bg-white dark:bg-gray-900">
            {open ? '−' : '+'}
          </span>
          {title}
        </span>
        <span className="sr-only">Bölümü {open ? 'kapat' : 'aç'}</span>
      </button>
      {open && <div className="px-4 pb-4 pt-3 space-y-3">{children}</div>}
    </section>
  );
}

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


/* — Editor kartı (ImageUploader entegre) — */
function ItemEditor(props: {
  it: MyItem;
  editTags: string; setEditTags: (s:string)=>void;
  editingItem: string|null; setEditingItem: (id:string|null)=>void;
  editDesc: string; setEditDesc: (s:string)=>void;
  editImg: string|null; setEditImg: (s:string|null)=>void;
  onSave: ()=>Promise<void>|void;
  onDelete: (id: string) => Promise<void> | void;
  myComment?: MyComment | null;
  onRateMyComment?: (commentId: string, itemId: string, value: number) => Promise<void> | void;
  trending: string[];
}) {
  const { it, editingItem, setEditingItem, editDesc, setEditDesc, editImg, setEditImg, editTags, setEditTags, onSave, onDelete, myComment, onRateMyComment, trending } = props;
  const isEditing = editingItem === it.id;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmDelTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmDelete) {
      if (confirmDelTimerRef.current) window.clearTimeout(confirmDelTimerRef.current);
      confirmDelTimerRef.current = window.setTimeout(() => setConfirmDelete(false), 3000);
    }
    return () => {
      if (confirmDelTimerRef.current) window.clearTimeout(confirmDelTimerRef.current);
    };
  }, [confirmDelete]);

  // Check for banned word violation in editDesc
  const violatedItem = findBanned(editDesc);

  return (
    <div
      className={`rounded-xl border p-4 bg-white dark:bg-gray-900 dark:border-gray-800 transition hover:shadow-md hover:-translate-y-0.5 overflow-hidden max-w-full ${ (it as any)?.suspended ? 'opacity-60 grayscale' : '' }`}
    >
      <div className="flex items-start gap-3">
        <Link href={spotlightHref(it.id)} prefetch={false} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 grid place-items-center">
          {it.imageUrl ? (
            <img src={it.imageUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={it.name} />
          ) : (
            <img src="/default-item.svg" alt="default" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          )}
        </Link>
        <div className="flex-1 min-w-0">
          {(it as any)?.suspended && (
            <div className="mb-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.335-.214 3.007-1.742 3.007H3.48c-1.528 0-2.492-1.672-1.742-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Askıda — yalnızca sen görüyorsun
            </div>
          )}
          <div className="flex items-center gap-2">
            <Link href={spotlightHref(it.id)} prefetch={false} className="text-base font-medium truncate break-words hover:underline">
              {it.name}
            </Link>

            <RatingPill avg={getAvg(it)} count={it.count ?? 0} />

            {it.edited && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">düzenlendi</span>
            )}
          </div>
          {/* My rating (based on Comment.rating) */}
          

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium">Açıklama</label>
              <textarea
                className={`w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700 ${violatedItem ? 'border-red-500 focus:ring-red-500' : ''}`}
                rows={3}
                value={editDesc}
                onChange={(e)=>setEditDesc(e.target.value)}
                placeholder="açıklama"
              />
              {violatedItem && (
                <div className="mt-1 text-xs text-red-600">
                  Bu metin yasaklı kelime içeriyor: “{violatedItem}”. Lütfen düzelt.
                </div>
              )}
<div>
  <div className="text-sm font-medium mb-1">Etiketler</div>
  <input
    type="text"
    value={editTags}
    onChange={(e)=> setEditTags(e.target.value)}
    placeholder="#kahve, #film veya kahve film"
    className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
  />
  <div className="mt-1 text-[11px] opacity-60">
    Virgülle ayırabilirsin.
  </div>
</div>
              <div>
                <div className="text-sm font-medium mb-1">Görsel</div>
                <ImageUploader value={editImg ?? null} onChange={setEditImg} />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={()=>{ if (!violatedItem) onSave(); }}
                  disabled={!!violatedItem}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${violatedItem ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-black text-white'}`}
                  title={violatedItem ? "Yasaklı kelime içeriyor" : "Kaydet"}
                >
                  Kaydet
                </button>
                <button onClick={()=>setEditingItem(null)} className="px-3 py-1.5 rounded-lg border text-sm">Vazgeç</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm opacity-80 mt-1">{it.description}</p>
              {!!(it.tags && it.tags.length) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {it.tags.slice(0, 10).map(t => {
                    const isTrend = trending.includes(t);
                    return (
                      <span
                        key={t}
                        className={
                          "px-2 py-0.5 rounded-full text-xs border " +
                          (isTrend
                            ? "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700"
                            : "bg-white dark:bg-gray-800 dark:border-gray-700")
                        }
                        title={isTrend ? "Trend" : undefined}
                      >
                        #{t}
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2"
                  onClick={()=>{
                    setEditingItem(it.id);
                    setEditDesc(it.description || "");
                    setEditImg(it.imageUrl ?? null);
                    setEditTags((it.tags || []).join(", "));
                  }}
                  title="Düzenle"
                  aria-label="Düzenle"
                >
                  <IconPencil className="w-4 h-4" />
                  <span className="sr-only">Düzenle</span>
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 ${
                    confirmDelete
                      ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
                      : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                  }`}
                  onClick={async () => {
                    if (confirmDelete) {
                      await onDelete(it.id);
                      setConfirmDelete(false);
                    } else {
                      setConfirmDelete(true);
                    }
                  }}
                  title={confirmDelete ? "Onaylamak için tekrar tıkla" : "Sil"}
                  aria-label={confirmDelete ? "Silmeyi onayla" : "Sil"}
                >
                  {confirmDelete ? <IconCheck className="w-4 h-4" /> : <IconTrash className="w-4 h-4" />}
                  <span className="sr-only">{confirmDelete ? "Silmeyi onayla" : "Sil"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* — Yorum satırı, kaldırma butonlu — */
function CommentRow({
  c,
  myRating,
  onRate,
  onSave,
  onDelete,
}: {
  c: MyComment;
  myRating: number | null;
  onRate: (itemId:string, value:number)=>Promise<void>|void;
  onSave: (id:string, t:string)=>Promise<void>;
  onDelete: (id:string)=>Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.text);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmDelTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmDelete) {
      if (confirmDelTimerRef.current) window.clearTimeout(confirmDelTimerRef.current);
      confirmDelTimerRef.current = window.setTimeout(() => setConfirmDelete(false), 3000);
    }
    return () => {
      if (confirmDelTimerRef.current) window.clearTimeout(confirmDelTimerRef.current);
    };
  }, [confirmDelete]);

  // Check for banned word violation in comment text
  const violatedComment = findBanned(val);

  return (
    <div className="rounded-xl border dark:border-gray-800 p-3 bg-white dark:bg-gray-900 transition hover:shadow-md hover:-translate-y-0.5 h-full">
      <div className="flex items-start gap-3">
        <Link href={spotlightHref(c.itemId)} prefetch={false} className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 grid place-items-center">
          {c.itemImageUrl ? (
            <img src={c.itemImageUrl} alt={c.itemName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <img src="/default-item.svg" alt="default" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={spotlightHref(c.itemId)} prefetch={false} className="text-sm opacity-70 truncate hover:underline">
            {c.itemName}
          </Link>
          <div className="mt-1 text-xs opacity-70 flex items-center gap-2" aria-label="Puanım">
            {editing ? (
              <div className="scale-90 origin-left">
                <Stars
                  key={`${c.id}:${myRating ?? 0}`}
                  value={myRating ?? 0}
                  rating={myRating ?? 0}
                  onRate={(n) => onRate(c.itemId, n)}
                  onRatingChange={(n: number) => onRate(c.itemId, n)}
                />
              </div>
            ) : (
              <div className="scale-90 origin-left">
                <Stars
                  key={`${c.id}:${myRating ?? 0}`}
                  value={myRating ?? 0}
                  rating={myRating ?? 0}
                  readOnly
                />
              </div>
            )}
            <span className="tabular-nums">{myRating != null ? myRating.toFixed(1) : '—'}</span>
          </div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={val}
                onChange={(e)=>setVal(e.target.value)}
                rows={3}
                className={`w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700 ${violatedComment ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {violatedComment && (
                <div className="mt-1 text-xs text-red-600">
                  Bu metin yasaklı kelime içeriyor: “{violatedComment}”. Lütfen düzelt.
                </div>
              )}
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1.5 rounded-lg border text-sm ${violatedComment ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-black text-white'}`}
                  onClick={()=> { if (!violatedComment) onSave(c.id, val).then(()=>setEditing(false)); }}
                  disabled={!!violatedComment}
                  title={violatedComment ? "Yasaklı kelime içeriyor" : "Kaydet"}
                >
                  Kaydet
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg border text-sm"
                  onClick={()=>{ setEditing(false); setVal(c.text); }}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm">
              “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
              <div className="mt-2 flex gap-2">
                <button
                  className="p-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center"
                  onClick={()=>setEditing(true)}
                  title="Düzenle"
                  aria-label="Düzenle"
                >
                  <IconPencil className="w-4 h-4" />
                </button>
                <button
                  className={`p-2 rounded-lg border text-sm flex items-center ${
                    confirmDelete
                      ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
                      : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                  }`}
                  onClick={async () => {
                    if (confirmDelete) {
                      await onDelete(c.id);
                      setConfirmDelete(false);
                    } else {
                      setConfirmDelete(true);
                    }
                  }}
                  title={confirmDelete ? "Onaylamak için tekrar tıkla" : "Yorumu kaldır"}
                  aria-label={confirmDelete ? "Kaldırmayı onayla" : "Yorumu kaldır"}
                >
                  {confirmDelete ? <IconCheck className="w-4 h-4" /> : <IconTrash className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    
  );
}