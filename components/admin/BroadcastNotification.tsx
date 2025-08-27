"use client";
import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";

export default function BroadcastNotification() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);

  async function submit() {
    setMsg(null); setErr(null); setLoading(true);
    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, body, image: image || undefined, link: link || undefined }),
    });
    const j = await res.json();
    setLoading(false);
    if (res.ok && j.ok) {
      setMsg(`Gönderildi (${j.created})`);
      setTitle(""); setBody(""); setImage(null); setLink("");
    } else {
      setErr(j.error || "Hata");
    }
  }

  return (
    <div className="rounded-2xl border p-4 bg-white dark:bg-neutral-900 max-w-md w-full">
      <h3 className="text-base font-semibold mb-3">Tüm Kullanıcılara Bildirim Gönder</h3>

      {msg && <div className="mb-3 text-sm text-emerald-600">{msg}</div>}
      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

      <div className="grid gap-3">
        <input className="border rounded-lg px-3 py-2 bg-transparent"
               placeholder="Başlık" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea className="border rounded-lg px-3 py-2 bg-transparent"
                  placeholder="Açıklama (body)" rows={3}
                  value={body} onChange={e=>setBody(e.target.value)} />
        <div>
          <div className="text-xs mb-1 opacity-70">Görsel (opsiyonel)</div>
          <ImageUploader
            value={image}
            onChange={setImage}
          />
        </div>
        <input className="border rounded-lg px-3 py-2 bg-transparent"
               placeholder="Tıklanınca gidilecek link (opsiyonel, örn: /share/abc)"
               value={link} onChange={e=>setLink(e.target.value)} />
        <div className="flex justify-end">
          <button disabled={loading || !title || !body}
                  onClick={submit}
                  className="h-9 px-4 rounded-lg bg-black text-white disabled:opacity-50">
            {loading ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}