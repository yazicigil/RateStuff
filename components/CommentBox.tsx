'use client';
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function CommentBox({ itemId, onDone }: { itemId: string; onDone?: ()=>void }) {
  const { data: session } = useSession();
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  async function submit() {
    if (!session) { await signIn('google'); return; }
    if (!text.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/items/${itemId}/comments`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
    const j = await r.json(); setBusy(false);
    if (j.ok) { setText(""); onDone?.(); } else alert('Hata: ' + j.error);
  }
  return (
    <div className="flex items-center gap-2 mt-2">
      <input className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px]" placeholder={session?'Yorum yaz…':'Yorum için giriş yap'} value={text} onChange={e=>setText(e.target.value)} disabled={busy}/>
      <button className="px-3 py-2 rounded-xl text-sm bg-black text-white disabled:opacity-50" onClick={submit} disabled={busy}>Ekle</button>
    </div>
  );
}
