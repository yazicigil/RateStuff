"use client";
import { useEffect, useMemo, useState } from "react";
import { SocialIcon } from "react-social-icons";

type SocialLink = {
  id: string;
  url: string;
  label?: string | null;
  platform?: string | null;
  order: number;
  visible: boolean;
};

export default function SocialBarEditor({ userId, onPreview, onClose }: { userId: string; onPreview?: (links: SocialLink[]) => void; onClose?: () => void }) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => [...links].sort((a, b) => a.order - b.order || 0),
    [links]
  );

  async function load() {
    const res = await fetch(`/api/users/${userId}/socials`, { cache: "no-store" });
    const data = await res.json();
    if (data?.ok) {
      setLinks(data.items);
      onPreview?.(data.items as SocialLink[]);
    }
  }

  useEffect(() => { load(); }, [userId]);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/users/${userId}/socials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, label: label || undefined, visible: true, order: links.length }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok && data?.ok) {
      setUrl(""); 
      setLabel("");
      onPreview?.([{ id: data.item.id, url: data.item.url, label: data.item.label, platform: data.item.platform, order: data.item.order, visible: data.item.visible }, ...links]);
      load();
    } else {
      console.error("Add social link failed:", data);
      alert("Bağlantı eklenemedi: " + (data?.error ?? res.statusText));
    }
  }

  async function toggleVisibility(id: string, visible: boolean) {
    await fetch(`/api/socials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible }),
    });
    setLinks(prev => {
      const next = prev.map(x => x.id === id ? { ...x, visible } : x);
      onPreview?.(next);
      return next;
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/socials/${id}`, { method: "DELETE" });
    setLinks(prev => {
      const next = prev.filter(x => x.id !== id);
      onPreview?.(next);
      return next;
    });
    load();
  }

  async function move(id: string, dir: -1 | 1) {
    const current = sorted.find((x) => x.id === id);
    if (!current) return;
    const idx = sorted.findIndex((x) => x.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    // optimistic reorder
    const copy = [...sorted];
    [copy[idx].order, copy[swapIdx].order] = [copy[swapIdx].order, copy[idx].order];
    setLinks(copy);
    onPreview?.(copy);

    // persist both items
    await Promise.all([
      fetch(`/api/socials/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: copy[idx].order }),
      }),
      fetch(`/api/socials/${copy[swapIdx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: copy[swapIdx].order }),
      }),
    ]);
    load();
  }

  async function saveInline(id: string, fields: Partial<Pick<SocialLink, "url"|"label">>) {
    await fetch(`/api/socials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setLinks(prev => {
      const next = prev.map(x => x.id === id ? { ...x, ...fields } : x);
      onPreview?.(next);
      return next;
    });
    load();
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-300/40 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium opacity-80">Sosyal bağlantılar</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { onClose?.(); }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm border border-zinc-300/50 hover:border-zinc-300/80 hover:bg-zinc-200/20 transition"
          >
            <span>Kaydet</span>
          </button>
        </div>
      </div>
      <form onSubmit={addLink} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-60">
          <label className="text-sm opacity-70">URL</label>
          <input
            type="url"
            required
            className="w-full rounded-xl border border-zinc-300/50 bg-white/5 px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500/40"
            placeholder="https://instagram.com/marka"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="w-56">
          <label className="text-sm opacity-70">Etiket (opsiyonel)</label>
          <input
            className="w-full rounded-xl border border-zinc-300/50 bg-white/5 px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500/40"
            placeholder="Instagram"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={30}
          />
        </div>
        <button
          disabled={saving}
          className="rounded-xl px-4 py-2 bg-emerald-600 text-white disabled:opacity-60"
        >
          {saving ? "Ekleniyor…" : "Ekle"}
        </button>
      </form>

      {!sorted.length ? (
        <p className="text-sm opacity-70">Henüz sosyal bağlantı eklenmemiş.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((l, i) => (
            <li key={l.id} className="flex items-center gap-3 rounded-xl border border-zinc-300/30 p-2">
              <div className="shrink-0">
                <SocialIcon url={l.url} style={{ height: 28, width: 28 }} />
              </div>

              <input
                className="flex-1 min-w-60 rounded-lg bg-transparent px-2 py-1 outline-none border border-transparent focus:border-zinc-300/50"
                value={l.url}
                onChange={(e) => setLinks(prev => prev.map(x => x.id === l.id ? { ...x, url: e.target.value } : x))}
                onBlur={(e) => saveInline(l.id, { url: e.target.value })}
              />
              <input
                className="w-48 rounded-lg bg-transparent px-2 py-1 outline-none border border-transparent focus:border-zinc-300/50"
                value={l.label ?? ""}
                placeholder="Etiket"
                onChange={(e) => setLinks(prev => prev.map(x => x.id === l.id ? { ...x, label: e.target.value } : x))}
                onBlur={(e) => saveInline(l.id, { label: e.target.value || undefined })}
                maxLength={30}
              />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(l.id, -1)}
                  className="rounded-lg px-2 py-1 border border-zinc-300/50 hover:bg-zinc-200/20"
                  aria-label="Yukarı taşı"
                  disabled={i === 0}
                >↑</button>
                <button
                  onClick={() => move(l.id, +1)}
                  className="rounded-lg px-2 py-1 border border-zinc-300/50 hover:bg-zinc-200/20"
                  aria-label="Aşağı taşı"
                  disabled={i === sorted.length - 1}
                >↓</button>
                <button
                  onClick={() => toggleVisibility(l.id, !l.visible)}
                  className={`rounded-lg px-2 py-1 border ${l.visible ? "border-amber-500/60" : "border-zinc-300/50 hover:bg-zinc-200/20"}`}
                  aria-label={l.visible ? "Gizle" : "Göster"}
                >
                  {l.visible ? "Gizle" : "Göster"}
                </button>
                <button
                  onClick={() => remove(l.id)}
                  className="rounded-lg px-2 py-1 border border-red-500/60 text-red-600"
                  aria-label="Sil"
                >
                  Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}