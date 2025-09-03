"use client";
import { useState } from "react";

type Props = {
  brandId?: string | null;
  initialBio?: string;
};

export default function BrandBioInline({ brandId, initialBio = "" }: Props) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!brandId) return;
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/brand/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, bio }),
      });
      if (!res.ok) throw new Error("save-failed");
      setEditing(false);
      if (typeof window !== "undefined") window.location.reload();
    } catch (e) {
      setErr("Kaydedilemedi. Tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    if (!bio) {
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-sm text-neutral-600 dark:text-neutral-300 hover:underline inline-flex items-center gap-1"
        >
          Açıklama ekle
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="text-neutral-600 dark:text-neutral-300">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 6.52l.92.92L5.92 19.58zM20.71 5.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.83 1.83 2.75 2.75 1.83-1.83z"/>
          </svg>
        </button>
      );
    }
    return (
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
        {bio}{" "}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-2 inline-flex items-center p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Açıklamayı düzenle"
          title="Düzenle"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="text-neutral-600 dark:text-neutral-300">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 6.52l.92.92L5.92 19.58zM20.71 5.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.83 1.83 2.75 2.75 1.83-1.83z"/>
          </svg>
        </button>
      </p>
    );
  }

  // Editing state (centered small modal)
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[min(96vw,560px)] rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Açıklamayı düzenle</h3>
          <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Kapat">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.3 19.71 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.29-6.3z"/></svg>
          </button>
        </div>
        <textarea
          className="w-full min-h-[140px] resize-y rounded-md border bg-white dark:bg-neutral-900 text-sm p-2 border-neutral-300 dark:border-neutral-700"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Markanız hakkında kısa bir açıklama..."
        />
        {err && <div className="text-xs text-red-600 dark:text-red-400 mt-2">{err}</div>}
        <div className="flex justify-end gap-2 pt-3">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">İptal</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-sm disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}