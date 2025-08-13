'use client';
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Stars from "./Stars";

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
  async function submit() {
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
  return (
    <form
      className="flex flex-col gap-3 mt-2"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Puan<span className="text-red-500">*</span>
        </label>
        <Stars rating={rating} onRatingChange={setRating} />
      </div>
      <div className="flex items-center gap-2">
        <input
          className="border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] bg-transparent dark:bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder={session ? 'Yorum yaz…' : 'Yorum için giriş yap'}
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          aria-label="Gönder"
          title="Gönder"
          className="grid place-items-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={busy || rating === 0}
        >
          {/* paper plane icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3.5 12L20.5 3.5 16 20.5l-4.5-5-5-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11.5 15.5L20.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </form>
  );
}
