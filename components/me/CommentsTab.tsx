'use client';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Stars from '@/components/common/Stars';

/** Tipler */
export type MyComment = {
  id: string;
  itemId: string;
  itemName: string;
  itemImageUrl?: string | null;
  text: string;
  edited?: boolean;
  rating?: number | null; // yoruma verdiğim puan
  score?: number; // net oy
};

/** Yardımcılar */
const spotlightHref = (id: string) => `/?item=${id}`;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as bannedModule from '@/lib/bannedWords';
const DEFAULT_BANNED_LIST: string[] = (bannedModule as any)?.bannedWords || (bannedModule as any)?.default || [];

function makeBannedRegex(list?: string[] | null) {
  if (!list || list.length === 0) return null;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = list.filter(Boolean).map((w) => esc(w.trim())).filter(Boolean);
  if (!parts.length) return null;
  return new RegExp(`\\b(${parts.join('|')})\\b`, 'iu');
}

/** Public API */
export default function CommentsTab({
  comments,
  loading,
  notify,
  onReload,
  bannedWords,
}: {
  comments: MyComment[];
  loading: boolean;
  notify: (msg: string) => void;
  onReload?: () => void | Promise<void>;
  bannedWords?: string[];
}) {
  const [localComments, setLocalComments] = useState<MyComment[]>(comments);
  useEffect(() => { setLocalComments(comments); }, [comments]);

  const [commentsLimit, setCommentsLimit] = useState(5);

  const BANNED_RE = useMemo(() => makeBannedRegex(bannedWords ?? DEFAULT_BANNED_LIST), [bannedWords]);
  const findBanned = useCallback((text: string | null | undefined): string | null => {
    if (!text || !BANNED_RE) return null;
    const m = text.match(BANNED_RE);
    return m ? m[0] : null;
  }, [BANNED_RE]);

  // --- API helpers ---
  async function changeMyCommentRatingLocal(commentId: string, itemId: string, value: number) {
    // optimistic
    setLocalComments(prev => prev.map(c => c.id === commentId ? { ...c, rating: value } : c));
    const r = await fetch(`/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: value }),
    });
    const j = await r.json().catch(() => null);
    if (!j?.ok) {
      alert('Hata: ' + (j?.error || r.status));
      // rollback by refetch if provided
      await onReload?.();
    }
  }

  async function saveCommentLocal(commentId: string, nextText: string) {
    const r = await fetch(`/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: nextText }),
    });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      setLocalComments(prev => prev.map(c => c.id === commentId ? { ...c, text: nextText, edited: true } : c));
      notify('Yorum güncellendi');
      await onReload?.();
    } else {
      alert('Hata: ' + (j?.error || r.status));
    }
  }

  async function deleteCommentLocal(commentId: string) {
    const r = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    const j = await r.json().catch(() => null);
    if (j?.ok) {
      setLocalComments(prev => prev.filter(c => c.id !== commentId));
      notify('Yorum silindi');
    } else {
      alert('Hata: ' + (j?.error || r.status));
    }
  }

  return (
    <section className="fade-slide-in rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="px-4 pb-4 pt-3 space-y-3">
        {loading ? (
          <Skeleton rows={4} />
        ) : localComments.length === 0 ? (
          <Box>Yorumun yok.</Box>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-3 items-stretch">
              {localComments.slice(0, commentsLimit).map((c) => (
                <CommentRow
                  key={c.id}
                  c={c}
                  myRating={typeof c.rating === 'number' ? c.rating : null}
                  onRate={(itemId, value) => changeMyCommentRatingLocal(c.id, itemId, value)}
                  onSave={saveCommentLocal}
                  onDelete={deleteCommentLocal}
                  findBanned={findBanned}
                />
              ))}
            </div>
            {localComments.length > commentsLimit && (
              <div className="pt-2">
                <button
                  className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
                  onClick={() => setCommentsLimit((l) => l + 5)}
                >
                  Daha fazla göster
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <style jsx>{`
        @keyframes fadeSlideIn {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-in { animation: fadeSlideIn 220ms ease-out both; }
      `}</style>
    </section>
  );
}

/* — Row — */
function CommentRow({
  c,
  myRating,
  onRate,
  onSave,
  onDelete,
  findBanned,
}: {
  c: MyComment;
  myRating: number | null;
  onRate: (itemId: string, value: number) => Promise<void> | void;
  onSave: (id: string, t: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  findBanned: (text: string) => string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.text);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const maxLen = 240;
  const counterId = React.useMemo(() => `mycm-counter-${c.id}`, [c.id]);

  const confirmDelTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmDelete) {
      if (confirmDelTimerRef.current) window.clearTimeout(confirmDelTimerRef.current);
      confirmDelTimerRef.current = window.setTimeout(() => setConfirmDelete(false), 3000);
    }
    return () => { if (confirmDelTimerRef.current) window.clearTimeout(confirmDelTimerRef.current); };
  }, [confirmDelete]);

  const violatedComment = findBanned?.(val) ?? null;

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
                <Stars key={`${c.id}:${myRating ?? 0}`} value={myRating ?? 0} rating={myRating ?? 0} readOnly />
              </div>
            )}
            <span className="tabular-nums">{myRating != null ? myRating.toFixed(1) : '—'}</span>
          </div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={val}
                onChange={(e) => setVal(e.target.value)}
                rows={3}
                maxLength={maxLen}
                aria-describedby={counterId}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = '0px';
                  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
                }}
                className={`w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700 ${violatedComment ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {violatedComment && (
                <div className="mt-1 text-xs text-red-600">
                  Bu metin yasaklı kelime içeriyor: “{violatedComment}”. Lütfen düzelt.
                </div>
              )}
              <div className="mt-1 flex items-center justify-end">
                <span id={counterId} className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                  {val.length}/{maxLen}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1.5 rounded-lg border text-sm ${violatedComment ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-black text-white'}`}
                  onClick={() => { if (!violatedComment) onSave(c.id, val); setEditing(false); }}
                  disabled={!!violatedComment}
                  title={violatedComment ? 'Yasaklı kelime içeriyor' : 'Kaydet'}
                >
                  Kaydet
                </button>
                <button className="px-3 py-1.5 rounded-lg border text-sm" onClick={() => { setEditing(false); setVal(c.text); }}>
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
                  onClick={() => setEditing(true)}
                  title="Düzenle"
                  aria-label="Düzenle"
                >
                  <IconPencil className="w-4 h-4" />
                </button>
                <ConfirmDeleteButton onConfirm={() => onDelete(c.id)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* — İki tık onaylı sil butonu — */
function ConfirmDeleteButton({ onConfirm }: { onConfirm: () => void | Promise<void> }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmDelete) {
      if (tRef.current) window.clearTimeout(tRef.current);
      tRef.current = window.setTimeout(() => setConfirmDelete(false), 3000);
    }
    return () => { if (tRef.current) window.clearTimeout(tRef.current); };
  }, [confirmDelete]);

  return (
    <button
      className={`p-2 rounded-lg border text-sm flex items-center ${
        confirmDelete
          ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
          : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
      }`}
      onClick={async () => {
        if (confirmDelete) { await onConfirm(); setConfirmDelete(false); }
        else { setConfirmDelete(true); }
      }}
      title={confirmDelete ? 'Onaylamak için tekrar tıkla' : 'Yorumu kaldır'}
      aria-label={confirmDelete ? 'Kaldırmayı onayla' : 'Yorumu kaldır'}
    >
      {confirmDelete ? <IconCheck className="w-4 h-4" /> : <IconTrash className="w-4 h-4" />}
    </button>
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

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border dark:border-gray-800 p-3 bg-white dark:bg-gray-900 flex items-center gap-2">
      {children}
    </div>
  );
}

function IconPencil({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.862 3.487a1.875 1.875 0 0 1 2.651 2.651L8.9 16.75a4.5 4.5 0 0 1-1.897 1.128l-2.935.881a.75.75 0 0 1-.93-.93l.881-2.935A4.5 4.5 0 0 1 5.25 13.1L16.862 3.487Z"/>
      <path d="M18.225 8.401l-2.626-2.626 1.06-1.06a.375.375 0 0 1 .53 0l2.096 2.096a.375.375 0 0 1 0 .53l-1.06 1.06Z"/>
    </svg>
  );
}

function IconTrash({ }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7l1-2h4l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
  );
}

function IconCheck({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
    </svg>
  );
}
