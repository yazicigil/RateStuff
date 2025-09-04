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
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overPos, setOverPos] = useState<"before" | "after">("before");

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

  function arrayMove<T>(arr: T[], from: number, to: number) {
    const copy = [...arr];
    const item = copy.splice(from, 1)[0];
    copy.splice(to, 0, item);
    return copy;
  }

  async function persistReorder(next: SocialLink[]) {
    const changed = next.filter((l, idx) => l.order !== idx);
    if (!changed.length) return;
    await Promise.all(
      changed.map((l, idx) =>
        fetch(`/api/socials/${l.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: next.findIndex(x => x.id === l.id) }),
        })
      )
    );
    load();
  }

  function onDragStart(id: string) {
    setDragId(id);
  }
  function onDragOver(e: React.DragEvent<HTMLLIElement>, over: string) {
    e.preventDefault();
    if (!dragId) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isBefore = (e.clientY - rect.top) < rect.height / 2;
    setOverId(over);
    setOverPos(isBefore ? "before" : "after");
    if (dragId === over) return;
    const from = sorted.findIndex(x => x.id === dragId);
    let to = sorted.findIndex(x => x.id === over);
    if (to === -1 || from === -1) return;
    // drop position is before/after hovered item
    to = isBefore ? to : to + 1;
    // when dragging down and inserting after, adjust because original index is removed first
    const adjusted = to > from ? to - 1 : to;
    if (adjusted === from) return;
    const next = arrayMove(sorted, from, adjusted).map((l, i) => ({ ...l, order: i }));
    setLinks(next);
    onPreview?.(next);
  }
  async function onDrop() {
    if (!dragId) return;
    const next = [...sorted].map((l, i) => ({ ...l, order: i }));
    setDragId(null);
    setOverId(null);
    await persistReorder(next);
  }
  function onDragLeave(e: React.DragEvent<HTMLLIElement>) {
    // Only clear if leaving the current element (avoid thrashing during child enter/leave)
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setOverId(null);
    }
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
      <form onSubmit={addLink} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-60">
          <label className="sr-only">URL</label>
          <input
            type="url"
            required
            className="w-full rounded-full border border-zinc-300/40 bg-white/5 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500/40"
            placeholder="https://instagram.com/marka"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="w-56">
          <label className="sr-only">Etiket</label>
          <input
            className="w-full rounded-full border border-zinc-300/40 bg-white/5 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500/40"
            placeholder="Etiket (opsiyonel)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={30}
          />
        </div>
        <button
          disabled={saving}
          className="rounded-full px-4 py-2 text-sm border border-emerald-500/60 text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-60"
        >
          {saving ? "Ekleniyor…" : "Ekle"}
        </button>
      </form>

      {!sorted.length ? (
        <p className="text-sm opacity-60">Henüz sosyal bağlantı eklenmemiş.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((l, i) => (
            <li
              key={l.id}
              draggable
              onDragStart={() => onDragStart(l.id)}
              onDragOver={(e) => onDragOver(e, l.id)}
              onDrop={onDrop}
              onDragLeave={onDragLeave}
              className={`relative flex items-center gap-2 rounded-lg border border-zinc-300/30 p-1.5 hover:bg-zinc-200/10 transition
    ${dragId === l.id ? "opacity-70 scale-[0.99] shadow-sm" : ""}`}
            >
              {(overId === l.id && dragId) && (
                <div
                  className={`absolute left-0 right-0 ${overPos === "before" ? "top-0" : "bottom-0"} h-0.5`}
                >
                  <div className="mx-1 h-full rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
              <div className="shrink-0">
                <SocialIcon url={l.url} style={{ height: 24, width: 24 }} />
              </div>

              <input
                className="flex-1 min-w-60 rounded-full bg-transparent px-3 py-1.5 text-sm outline-none border border-zinc-300/30 focus:border-zinc-300/60"
                value={l.url}
                onChange={(e) => setLinks(prev => prev.map(x => x.id === l.id ? { ...x, url: e.target.value } : x))}
                onBlur={(e) => saveInline(l.id, { url: e.target.value })}
              />
              <input
                className="w-44 rounded-full bg-transparent px-3 py-1.5 text-sm outline-none border border-zinc-300/30 focus:border-zinc-300/60"
                value={l.label ?? ""}
                placeholder="Etiket"
                onChange={(e) => setLinks(prev => prev.map(x => x.id === l.id ? { ...x, label: e.target.value } : x))}
                onBlur={(e) => saveInline(l.id, { label: e.target.value || undefined })}
                maxLength={30}
              />

              <div className="flex items-center gap-1.5">
                {/* Drag handle */}
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-zinc-300/40 text-zinc-500 cursor-grab select-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <button
                  onClick={() => toggleVisibility(l.id, !l.visible)}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full border ${l.visible ? "border-amber-500/60" : "border-zinc-300/50 hover:bg-zinc-200/20"}`}
                  aria-label={l.visible ? "Gizle" : "Göster"}
                  title={l.visible ? "Gizle" : "Göster"}
                >
                  {l.visible ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => remove(l.id)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-500/60 text-red-600 hover:bg-red-500/10"
                  aria-label="Sil"
                  title="Sil"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M10 6l1-2h2l1 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}