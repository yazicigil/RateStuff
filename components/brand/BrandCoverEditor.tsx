"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

// ImageUploader lives at components/common/ImageUploader per user request
const ImageUploader = dynamic(() => import("@/components/common/ImageUploader"), { ssr: false });

type Props = {
  brandId?: string | null;
  initialCoverUrl?: string;
  recommendText?: string;
};

export default function BrandCoverEditor({
  brandId,
  initialCoverUrl = "",
  recommendText = "Önerilen boyut: 1600x400px (JPG/PNG, max 2MB)",
}: Props) {
  const [open, setOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!brandId) { setOpen(false); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/brand/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, coverImageUrl: coverUrl || null }),
      });
      if (!res.ok) throw new Error("save-failed");
      // Optimistic close; consumer page is server-rendered, so refresh
      if (typeof window !== "undefined") window.location.reload();
    } catch (e) {
      setErr("Kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <>
      {/* Pencil button (top-right on cover) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute top-3 right-3 z-10 rounded-full bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 p-2 hover:bg-white dark:hover:bg-neutral-800 shadow"
        aria-label="Kapak görselini düzenle"
        title="Kapak görselini düzenle"
      >
         <svg width="18" height="18" viewBox="0 0 24 24" className="text-neutral-800 dark:text-neutral-100">
            <path
              d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25z"
              fill="currentColor"
            />
            <path
              d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
              fill="currentColor"
            />
          </svg>
      </button>

      {/* Modal */}
      {open && (
        <>
          <div className="fixed inset-0 z-[10020] bg-black/50 backdrop-blur-sm" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-[10030] flex items-center justify-center">
            <div className="w-[min(96vw,560px)] rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Kapak görseli</h3>
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Kapat">
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.3 19.71 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.29-6.3z"/></svg>
                </button>
              </div>

              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{recommendText}</div>

              <div className="space-y-4">
                {/* @ts-ignore dynamic component; project-local props */}
                <ImageUploader
                  value={coverUrl}
                  onChange={(url: string | null) => setCoverUrl(url ?? "")}
                  className="rounded-md"
                />

                {err && <div className="text-xs text-red-600 dark:text-red-400">{err}</div>}

                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">İptal</button>
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
          </div>
        </>
      )}
    </>
  );
}
