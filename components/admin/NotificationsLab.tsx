"use client";
import { useEffect, useMemo, useState } from "react";

type Template = {
  type: string;
  title: string;
  body: string;
  image: string | null;
  updatedAt: string;
};

export default function NotificationsLab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Template | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/notification-templates", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setTemplates(j.templates);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return templates;
    return templates.filter(t =>
      t.type.toLowerCase().includes(s) ||
      t.title.toLowerCase().includes(s) ||
      t.body.toLowerCase().includes(s)
    );
  }, [q, templates]);

  async function save(t: Template) {
    const r = await fetch(`/api/admin/notification-templates/${encodeURIComponent(t.type)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t.title, body: t.body, image: t.image }),
    });
    const j = await r.json();
    if (j.ok) {
      setTemplates(prev => prev.map(x => x.type === t.type ? j.template : x));
      setSel(j.template);
    } else {
      alert("Kaydedilemedi: " + j.error);
    }
  }

  async function sendTest(type: string, payload: {
    userId?: string;
    data?: any;
    link?: string;
    imageOverride?: string;
  }) {
    const r = await fetch("/api/admin/notifications/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...payload }),
    });
    const j = await r.json();
    if (!j.ok) alert("Test başarısız: " + j.error);
    else alert("Test bildirimi gönderildi");
  }

  return (
    <div className="rounded-2xl border p-4 bg-emerald-50/50 dark:bg-emerald-950/20">
      <div className="flex items-center gap-3 mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" className="text-emerald-600 dark:text-emerald-400"><path d="M12 22c4.97 0 9-4.03 9-9S16.97 4 12 4 3 8.03 3 13c0 2.09.72 4.01 1.93 5.53L4 22l3.72-.95A8.94 8.94 0 0 0 12 22z" fill="currentColor"/></svg>
        <h3 className="text-base font-semibold">Bildirim Laboratuvarı</h3>
        <div className="ml-auto text-xs opacity-60">{loading ? "Yükleniyor…" : `${templates.length} tip`}</div>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Ara (type, başlık, gövde)…"
          className="w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900"
        />
        <button onClick={load} className="px-3 py-2 rounded-md border hover:bg-white/50 dark:hover:bg-neutral-900/50">Yenile</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Liste */}
        <div className="rounded-lg border bg-white dark:bg-neutral-900 max-h-[420px] overflow-auto">
          {filtered.map(t => (
            <button
              key={t.type}
              className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800 ${sel?.type === t.type ? "bg-neutral-50 dark:bg-neutral-800" : ""}`}
              onClick={() => setSel(t)}
            >
              <div className="text-xs font-mono opacity-70">{t.type}</div>
              <div className="text-sm font-medium line-clamp-1">{t.title}</div>
              <div className="text-xs opacity-70 line-clamp-1">{t.body}</div>
            </button>
          ))}
          {filtered.length === 0 && <div className="p-6 text-sm opacity-60">Sonuç yok</div>}
        </div>

        {/* Editör + Test */}
        <div className="rounded-lg border bg-white dark:bg-neutral-900 p-3">
          {!sel ? (
            <div className="opacity-60 text-sm">Düzenlemek için soldan bir tip seç.</div>
          ) : (
            <Editor sel={sel} onSave={save} onTest={sendTest} />
          )}
        </div>
      </div>
    </div>
  );
}

function Editor({
  sel,
  onSave,
  onTest,
}: {
  sel: Template;
  onSave: (t: Template) => Promise<void>;
  onTest: (type: string, payload: { userId?: string; data?: any; link?: string; imageOverride?: string; }) => Promise<void>;
}) {
  const [form, setForm] = useState<Template>(sel);
  const [userId, setUserId] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [imageOverride, setImageOverride] = useState<string>("");
  const [dataStr, setDataStr] = useState<string>('{"itemName":"Örnek", "stars":5, "reason":"spam", "count":3, "author":"A**** U****", "excerpt":"Kısa yorum…"}');

  useEffect(() => { setForm(sel); }, [sel]);

  const tryTest = async () => {
    let payload: any = {};
    try { payload = JSON.parse(dataStr || "{}"); } catch { alert("Geçersiz JSON"); return; }
    await onTest(form.type, { userId: userId || undefined, data: payload, link: link || undefined, imageOverride: imageOverride || undefined });
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-mono opacity-70">{form.type}</div>

      <div>
        <label className="text-xs opacity-70">Başlık</label>
        <input
          className="w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs opacity-70">Gövde</label>
        <textarea
          className="w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900 min-h-[90px]"
          value={form.body}
          onChange={e => setForm({ ...form, body: e.target.value })}
        />
        <div className="text-xs opacity-60 mt-1">Kullanabileceğin placeholder örnekleri: {"{itemName} {stars} {reason} {count} {author} {excerpt} {title} {details}"}</div>
      </div>

      <div>
        <label className="text-xs opacity-70">Görsel (varsayılan)</label>
        <input
          className="w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900"
          value={form.image || ""}
          onChange={e => setForm({ ...form, image: e.target.value || null })}
          placeholder="/badges/flag.svg"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={() => onSave(form)} className="px-3 py-2 rounded-md border bg-emerald-600 text-white hover:bg-emerald-700">Kaydet</button>
        <button onClick={() => setForm(sel)} className="px-3 py-2 rounded-md border">Geri al</button>
      </div>

      <hr className="opacity-20" />

      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs opacity-70">Test User ID (boş → kendime)</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900" value={userId} onChange={e => setUserId(e.target.value)} />
        </div>
        <div>
          <label className="text-xs opacity-70">Test Link (opsiyonel)</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900" value={link} onChange={e => setLink(e.target.value)} placeholder="/share/xyz" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs opacity-70">Test Görsel Override (opsiyonel)</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900" value={imageOverride} onChange={e => setImageOverride(e.target.value)} placeholder="/badges/upvote.svg" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs opacity-70">Test Data (JSON)</label>
          <textarea className="w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900 min-h-[90px]" value={dataStr} onChange={e => setDataStr(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={tryTest} className="px-3 py-2 rounded-md border bg-emerald-600 text-white hover:bg-emerald-700">Test bildirimi gönder</button>
      </div>
    </div>
  );
}