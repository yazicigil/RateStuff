"use client";
import * as React from "react";
import Image from "next/image";
import clsx from "clsx";
import ImageUploader from "@/components/common/ImageUploader";

type Props = {
  className?: string;
  initialUrl?: string | null;
  name?: string | null;
};

export default function EditAvatar({ className, initialUrl = "", name }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [url, setUrl] = React.useState<string>(initialUrl || "");
  const [draftUrl, setDraftUrl] = React.useState<string>(initialUrl || "");
  const displayLetter = (name ?? "").trim()[0] || "B";

  const onSave = async () => {
    try {
      setSaving(true);
      // Persist avatar to server (updates User.avatarUrl)
      const res = await fetch("/api/brand/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: draftUrl || null }),
      });
      if (!res.ok) {
        console.error("Avatar update failed", await res.text());
        // even if server fails, keep UI consistent?
        // throw new Error("Avatar update failed");
      }
      setUrl(draftUrl || "");
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setDraftUrl(url || "");
    setOpen(false);
  };

  return (
    <>
      {/* Avatar + pencil trigger */}
      <div className={clsx("rounded-full ring-4 ring-purple-500 shadow-lg bg-neutral-200 dark:bg-neutral-800 overflow-hidden relative", className)}>
        {url ? (
          <Image src={url} alt={name ?? "Avatar"} fill className="object-cover rounded-full" />
        ) : (
          <div className="w-full h-full grid place-items-center text-3xl font-semibold text-neutral-600 dark:text-neutral-400 rounded-full">
            {displayLetter}
          </div>
        )}

        {/* Pencil button */}
        <button
          type="button"
          aria-label="Avatarı düzenle"
          onClick={() => setOpen(true)}
          className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full grid place-items-center bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-900 backdrop-blur-sm"
        >
          {/* inline pencil svg */}
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-neutral-800 dark:text-neutral-100">
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
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">Avatarı Düzenle</h3>
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Kapat"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" className="text-neutral-700 dark:text-neutral-300">
                    <path d="M6.4 19.2L4.8 17.6 10.4 12 4.8 6.4 6.4 4.8 12 10.4 17.6 4.8 19.2 6.4 13.6 12 19.2 17.6 17.6 19.2 12 13.6z" fill="currentColor"/>
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <ImageUploader
                  value={draftUrl}
                  onChange={(u) => setDraftUrl(u || "")}
                  className="w-full"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Önerilen en az boyut: <strong>256×256px</strong> (JPG/PNG).
                </p>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 rounded-md text-sm bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-sm text-white",
                    saving ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
                  )}
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}