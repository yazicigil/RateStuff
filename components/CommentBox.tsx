'use client';

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Stars from "./Stars";
import { containsBannedWord } from "@/lib/bannedWords";

function maskName(s?: string | null) {
  if (!s) return 'Anonim';
  const raw = String(s).trim();
  if (!raw) return 'Anonim';
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.map((p) => p.charAt(0).toUpperCase() + '*'.repeat(Math.max(1, p.length - 1))).join(' ');
}

export default function CommentBox({
  itemId,
  onDone,
  initialRating = 0,
  myComment,
}: {
  itemId: string;
  onDone?: () => void;
  initialRating?: number;
  myComment?: {
    id: string;
    text: string;
    rating?: number | null;
    edited?: boolean;
    user?: { id?: string; name?: string | null; avatarUrl?: string | null; verified?: boolean } | null;
    votes?: { value: number }[] | null;
    upCount?: number;
    downCount?: number;
  };
}) {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState<number>(initialRating || 0);
  const [editMode, setEditMode] = useState(false);
  const upVotes = myComment?.upCount ?? (Array.isArray(myComment?.votes) ? myComment!.votes!.filter(v => v?.value === 1).length : 0);
  const downVotes = myComment?.downCount ?? (Array.isArray(myComment?.votes) ? myComment!.votes!.filter(v => v?.value === -1).length : 0);
  const isMac = typeof window !== 'undefined' && /(Mac|iPhone|iPad|Macintosh)/.test(navigator.userAgent || '');
  const maxLen = 500;
  const hasBanned = containsBannedWord(text);
  const canSend = !busy && rating > 0 && !hasBanned;
  const ratingText = ['', 'Çok kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel'][rating] ?? '';
  const counterId = `cb-count-${itemId}`;

  async function updateMyComment() {
    if (!session) {
      await signIn('google');
      return;
    }
    if (!myComment) return;
    if (hasBanned) {
      alert("Yorumunuzda yasaklı kelime bulunuyor.");
      return;
    }
    setBusy(true);
    try {
      // 1) Primary route
      let res = await fetch(`/api/comments/${myComment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, rating }),
      });
      if (!res.ok && res.status !== 200) {
        // 2) Fallback route
        res = await fetch(`/api/items/${itemId}/comments`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId: myComment.id, text, rating }),
        });
      }
      if (!res.ok) throw new Error(`Güncellenemedi (${res.status})`);
      setEditMode(false);
      onDone?.();
    } catch (err: any) {
      alert('Hata: ' + (err?.message || 'Güncellenemedi'));
    } finally {
      setBusy(false);
    }
  }
  async function deleteMyComment() {
    if (!session) {
      await signIn('google');
      return;
    }
    if (!myComment) return;
    if (!confirm('Yorumu silmek istediğine emin misin?')) return;
    setBusy(true);
    try {
      // 1) Primary route
      let res = await fetch(`/api/comments/${myComment.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 200) {
        // 2) Fallback route
        res = await fetch(`/api/comment/${myComment.id}`, { method: 'DELETE' });
      }
      if (!res.ok) throw new Error(`Silinemedi (${res.status})`);
      onDone?.();
    } catch (err: any) {
      alert('Hata: ' + (err?.message || 'Silinemedi'));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (hasBanned) {
      alert("Yorumunuzda yasaklı kelime bulunuyor.");
      return;
    }
    if (!session) {
      await signIn('google');
      return;
    }
    if (rating === 0) return;
    setBusy(true);
    const r = await fetch(`/api/items/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, rating }),
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) {
      setText("");
      setRating(initialRating || 0);
      onDone?.();
    } else alert('Hata: ' + j.error);
  }

  if (myComment) {
    if (editMode) {
      return (
        <form
          className="flex flex-col gap-3 mt-2"
          onSubmit={(e) => { e.preventDefault(); updateMyComment(); }}
        >
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Puan<span className="text-red-500">*</span>
              </label>
              {rating > 0 && (
                <span className="text-xs rounded-full px-2 py-0.5 border border-emerald-300/60 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20">
                  {(['','Çok kötü','Kötü','Orta','İyi','Mükemmel'][rating] ?? '')}
                </span>
              )}
            </div>
            <Stars rating={rating} onRatingChange={setRating} />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                className={"w-full border rounded-xl px-3 py-2 text-sm min-h-[40px] max-h-40 bg-transparent dark:bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 resize-none overflow-hidden " +
                  (hasBanned
                    ? "border-red-500 ring-red-500 focus:ring-red-500 dark:border-red-600 dark:ring-red-600"
                    : "border-gray-300 dark:border-gray-700 focus:ring-emerald-400")}
                value={text}
                onChange={e => setText(e.target.value)}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = '0px';
                  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
                }}
                disabled={busy}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-3 h-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200"
              >
                İptal
              </button>
              <button
                type="submit"
                className={"px-3 h-10 rounded-full " + (hasBanned ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700")}
                disabled={hasBanned || busy}
              >
                Kaydet
              </button>
            </div>
          </div>
        </form>
      );
    }
    return (
      <div className="pt-3">
        <div className="flex items-start gap-2 justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-900/20 p-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {myComment.user?.avatarUrl ? (
              <img src={myComment.user.avatarUrl} alt={maskName(myComment.user?.name)} className="w-5 h-5 rounded-full object-cover mt-0.5" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] mt-0.5">
                {(maskName(myComment.user?.name) || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs opacity-70 flex items-center gap-2">
                <span>Senin yorumun</span>
                {typeof myComment.rating === 'number' && myComment.rating > 0 ? (
                  <span className="inline-block bg-emerald-200 text-emerald-900 text-[11px] px-2 py-0.5 rounded-full">{myComment.rating}★</span>
                ) : null}
                <span className="ml-auto flex items-center gap-3 text-[11px] text-emerald-900/80 dark:text-emerald-200/80">
                  <span className="flex items-center gap-1">
                    {/* up icon */}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 14l5-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {upVotes}
                  </span>
                  <span className="flex items-center gap-1">
                    {/* down icon */}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M17 10l-5 5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {downVotes}
                  </span>
                </span>
              </div>
              <div className="w-full flex items-baseline gap-1 min-w-0">
                <div className="truncate w-full">
                  “{myComment.text}” {myComment.edited && <em className="opacity-60">(düzenlendi)</em>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <button
              type="button"
              onClick={() => { setText(myComment.text || ""); setRating(myComment.rating || 0); setEditMode(true); }}
              className="w-8 h-8 grid place-items-center rounded-md hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              title="Yorumu düzenle"
              aria-label="Yorumu düzenle"
            >
              {/* pencil icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20l4.5-1 10-10-3.5-3.5-10 10L4 20z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={deleteMyComment}
              className="w-8 h-8 grid place-items-center rounded-md hover:bg-red-100/60 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
              title="Yorumu sil"
              aria-label="Yorumu sil"
            >
              {/* trash icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7l1-2h4l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 mt-2"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Puan<span className="text-red-500">*</span>
          </label>
          {rating > 0 && (
            <span className="text-xs rounded-full px-2 py-0.5 border border-emerald-300/60 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20">
              {ratingText}
            </span>
          )}
        </div>
        <Stars rating={rating} onRatingChange={setRating} />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            className={
              "w-full border rounded-xl px-3 py-2 text-sm min-h-[40px] max-h-40 bg-transparent dark:bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 resize-none overflow-hidden " +
              (hasBanned
                ? "border-red-500 ring-red-500 focus:ring-red-500 dark:border-red-600 dark:ring-red-600"
                : "border-gray-300 dark:border-gray-700 focus:ring-emerald-400")
            }
            placeholder={session ? 'Yorum yaz…' : 'Yorum için giriş yap'}
            value={text}
            onChange={e => setText(e.target.value)}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = '0px';
              el.style.height = Math.min(el.scrollHeight, 160) + 'px';
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) submit();
              }
            }}
            disabled={busy}
            maxLength={maxLen}
            aria-describedby={counterId}
            rows={1}
          />
          {hasBanned && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-500">
              Yorumunuzda yasaklı kelime bulunuyor.
            </p>
          )}
          <div className="mt-1 flex items-center justify-end">
            <span id={counterId} className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
              {text.length}/{maxLen}
            </span>
          </div>
        </div>
        {session ? (
          <button
            type="submit"
            aria-label="Gönder"
            title="Gönder"
            className={
              "grid place-items-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 " +
              (canSend
                ? "bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                : "bg-white/80 dark:bg-gray-800/80 text-gray-400 cursor-not-allowed")
            }
            disabled={!canSend}
          >
            {/* paper plane icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3.5 12L20.5 3.5 16 20.5l-4.5-5-5-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11.5 15.5L20.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => signIn('google')}
            className="grid place-items-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title="Giriş yap"
            aria-label="Giriş yap"
          >
            {/* login icon (arrow into door) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 12h11M10 9l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
