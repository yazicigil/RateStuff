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

  const [plan, setPlan] = useState(false);
  const [when, setWhen] = useState<string>(""); // ISO-like from <input type="datetime-local">

  async function submit() {
    setMsg(null); setErr(null); setLoading(true);
    const payload: any = { title, body };
    if (image) payload.image = image;
    if (link) payload.link = link;
    if (plan && when) payload.scheduledAt = new Date(when).toISOString();

    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    setLoading(false);
    if (res.ok && j.ok) {
      if (j.scheduled) {
        setMsg(`Planlandı: ${new Date(j.scheduledAt).toLocaleString()}`);
      } else {
        setMsg(`Gönderildi (${j.created})`);
      }
      setTitle(""); setBody(""); setImage(null); setLink(""); setPlan(false); setWhen("");
    } else {
      setErr(j.error || "Hata");
    }
  }

  return (
    <div className="rounded-2xl border p-4 bg-green-50 dark:bg-green-900/20 border-green-300 max-w-md w-full">
      <h3 className="flex items-center gap-2 text-base font-semibold mb-3 text-green-700 dark:text-green-300">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-green-600 dark:text-green-400">
          <path d="M12 2a7 7 0 00-7 7v3.586l-.707.707A1 1 0 005 15h14a1 1 0 00.707-1.707L19 12.586V9a7 7 0 00-7-7zm0 20a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
        </svg>
        Tüm Kullanıcılara Bildirim Gönder
      </h3>

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
        {/* Scheduling controls */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={plan} onChange={(e)=>setPlan(e.target.checked)} />
            Planla
          </label>
          {plan && (
            <input
              type="datetime-local"
              value={when}
              onChange={(e)=>setWhen(e.target.value)}
              className="border rounded px-2 py-1 bg-transparent"
            />
          )}
        </div>
        <div className="flex justify-end">
          <button disabled={loading || !title || !body}
                  onClick={submit}
                  className="h-9 px-4 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
            {loading ? (plan ? "Planlanıyor..." : "Gönderiliyor...") : (plan ? "Planla" : "Gönder")}
          </button>
        </div>
      </div>
    </div>
  );
}