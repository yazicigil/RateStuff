'use client';
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Stars from "./Stars";
import bannedWordsMod from "@/lib/bannedWords";
const containsBannedWord: (t: string) => boolean =
  (bannedWordsMod as any)?.containsBannedWord ||
  (bannedWordsMod as any)?.default ||
  ((t: string) => false);

export default function CommentBox({
  itemId,
  onDone,
  initialRating = 0,
}: {
  itemId: string;
  onDone?: () => void;
  initialRating?: number;
}) {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState<number>(initialRating || 0);
  const isMac = typeof window !== 'undefined' && /(Mac|iPhone|iPad|Macintosh)/.test(navigator.userAgent || '');
  const maxLen = 500;
  const hasBanned = containsBannedWord(text);
  const canSend = !busy && rating > 0 && text.trim().length > 0 && !hasBanned;
  const ratingText = ['', 'Çok kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel'][rating] ?? '';
  const counterId = `cb-count-${itemId}`;
  async function submit() {
    if (!session) {
      await signIn('google');
      return;
    }
    if (containsBannedWord(text)) {
      alert('Yorumda yasaklı kelime kullanılamaz.');
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
            className={"w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm min-h-[40px] max-h-40 bg-transparent dark:bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none resize-none overflow-hidden " + (hasBanned ? "focus:ring-2 focus:ring-red-400 ring-2 ring-red-400" : "focus:ring-2 focus:ring-emerald-400")}
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
          <div className="mt-1 flex items-center justify-end">
            <span id={counterId} className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
              {text.length}/{maxLen}
            </span>
          </div>
          {hasBanned && (
            <p className="mt-1 text-[12px] text-red-500">Yorumda yasaklı kelime kullanılamaz.</p>
          )}
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
