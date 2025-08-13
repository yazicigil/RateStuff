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
    if (!text.trim() || rating === 0) return;
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
      className="flex flex-col gap-2 mt-2"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">
          Puan<span className="text-red-500">*</span>
        </label>
        <Stars rating={rating} onRatingChange={setRating} />
      </div>
      <div className="flex items-center gap-2">
        <input
          className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px]"
          placeholder={session ? 'Yorum yaz…' : 'Yorum için giriş yap'}
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-xl text-sm bg-black text-white disabled:opacity-50"
          onClick={submit}
          disabled={busy || rating === 0}
        >
          Ekle
        </button>
      </div>
    </form>
  );
}
