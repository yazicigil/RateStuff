"use client";
import { useRef, useCallback } from "react";
import ImageUploader from "@/components/common/ImageUploader";

type BrandMinimal = {
  id: string;
  email: string;
  displayName: string | null;
};

export default function EditBrandModal({
  brand,
  defaultAvatarUrl,
  updateAction,
  triggerClassName = "px-2 py-1 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800",
}: {
  brand: BrandMinimal;
  defaultAvatarUrl?: string;
  updateAction: (formData: FormData) => Promise<void>;
  triggerClassName?: string;
}) {
  const dlgRef = useRef<HTMLDialogElement | null>(null);

  const open = useCallback(() => { dlgRef.current?.showModal(); }, []);
  const close = useCallback(() => { dlgRef.current?.close(); }, []);

  return (
    <>
      <button type="button" onClick={open} className={triggerClassName}>
        Düzenle
      </button>

      <dialog
        ref={dlgRef}
        className="rounded-xl border bg-white p-0 w-[560px] max-w-[95vw] shadow-2xl backdrop:bg-black/40 dark:bg-neutral-900 dark:border-neutral-800"
      >
        <div className="p-4 md:p-5 border-b dark:border-neutral-800 flex items-start justify-between gap-4">
          <div>
            <div className="text-base md:text-lg font-semibold">Brand hesabını düzenle</div>
            <div className="text-xs md:text-sm text-neutral-500 mt-1">
              E-posta, görünen ad ve avatar bilgisini güncelleyebilirsin.
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Kapat" className="px-2 py-1 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800">✕</button>
        </div>

        <form action={updateAction} className="p-4 md:p-5 space-y-3">
          <input type="hidden" name="id" value={brand.id} />

          <label className="text-xs text-neutral-500 block">
            E-posta
            <input name="email" type="email" defaultValue={brand.email} placeholder="email@brand.com" className="w-full mt-1 px-3 py-2 rounded-md border bg-white dark:bg-neutral-900 dark:border-neutral-800" />
          </label>

          <label className="text-xs text-neutral-500 block">
            Görünen ad
            <input name="displayName" defaultValue={brand.displayName ?? ""} placeholder="Görünen ad" className="w-full mt-1 px-3 py-2 rounded-md border bg-white dark:bg-neutral-900 dark:border-neutral-800" />
          </label>

          <div>
            <span className="text-xs text-neutral-500">Avatar</span>
            <div className="mt-1">
              <ImageUploader name="avatarUrl" defaultValue={defaultAvatarUrl ?? ""} className="w-full" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} className="px-3 py-1.5 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800">İptal</button>
            <button className="px-3 py-1.5 rounded-md border bg-emerald-600 text-white hover:bg-emerald-700">Kaydet</button>
          </div>
        </form>
      </dialog>
    </>
  );
}