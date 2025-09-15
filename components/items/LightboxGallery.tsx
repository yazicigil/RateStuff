import React, { useEffect, useMemo, useRef, useState } from "react";
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

// Types for images coming from item and comments
export type LightboxImage = {
  id?: string | number;
  url: string;
  width?: number | null;
  height?: number | null;
  blurDataUrl?: string | null;
  // optional label for a11y
  alt?: string;
  // order is respected when present
  order?: number | null;
};

export type LightboxGalleryProps = {
  /** Item cover image (goes to index 0) */
  itemImage?: LightboxImage | null;
  /** All comment images for the item */
  commentImages?: LightboxImage[];
  /** Open/close control */
  isOpen: boolean;
  onClose: () => void;
  /** Start on a specific image (0-based, default 0 => item image if present) */
  initialIndex?: number;
  /** Optional: controlled current index */
  index?: number;
  onIndexChange?: (idx: number) => void;
};

/**
 * LightboxGallery
 * - Renders a full-screen modal with left/right navigation.
 * - Image order: [itemImage] + commentImages (by ascending order, then id/index).
 * - Keyboard: Esc closes, ← → navigate.
 * - Mouse/touch: Click edges or buttons to navigate, click outside image to close.
 */
export default function LightboxGallery({
  itemImage,
  commentImages = [],
  isOpen,
  onClose,
  initialIndex = 0,
  index,
  onIndexChange,
}: LightboxGalleryProps) {
  const [internalIndex, setInternalIndex] = useState(initialIndex);
  const currentIndex = typeof index === "number" ? index : internalIndex;
  const setIndex = (v: number) => {
    if (onIndexChange) onIndexChange(v); else setInternalIndex(v);
  };

  // Compose the image list: item image first, then comments sorted by order
  const images: LightboxImage[] = useMemo(() => {
    const base: LightboxImage[] = [];
    if (itemImage?.url) base.push({ ...itemImage, alt: itemImage.alt ?? "Ürün görseli" });
    const rest = [...(commentImages || [])]
      .filter((im) => !!im?.url)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    base.push(...rest);
    return base;
  }, [itemImage, commentImages]);

  const total = images.length;

  // Keep index in bounds when images array changes
  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= total) setIndex(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // Reset to initial index when opened
  useEffect(() => {
    if (isOpen) {
      setIndex(Math.min(initialIndex, Math.max(0, total - 1)));
      // Prevent body scroll
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
    }
    return () => { document.documentElement.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keyboard handlers
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Simple swipe detection
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx > 40) prev();
    if (dx < -40) next();
    startX.current = null;
  };

  const prev = () => setIndex((currentIndex - 1 + total) % total);
  const next = () => setIndex((currentIndex + 1) % total);

  if (!isOpen) return null;
  if (total === 0) return null;

  const current = images[currentIndex];

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90 select-none">
        <div className="text-sm">{currentIndex + 1} / {total}</div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/15 px-3 py-1.5 ring-1 ring-white/20"
        >
          <XMarkIcon className="h-5 w-5" />
          <span className="text-sm">Kapat</span>
        </button>
      </div>

      {/* stage */}
      <div className="relative flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* image */}
        <img
          key={String(current.id ?? current.url)}
          src={current.url}
          alt={current.alt ?? "Görsel"}
          className="max-h-[80vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
          draggable={false}
        />

        {/* nav arrows */}
        {total > 1 && (
          <>
            <button
              aria-label="Önceki"
              className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 p-2 ring-1 ring-white/20"
              onClick={prev}
            >
              <ChevronLeftIcon className="h-7 w-7 text-white" />
            </button>
            <button
              aria-label="Sonraki"
              className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 p-2 ring-1 ring-white/20"
              onClick={next}
            >
              <ChevronRightIcon className="h-7 w-7 text-white" />
            </button>
          </>
        )}
      </div>

      {/* filmstrip thumbnails */}
      {total > 1 && (
        <div className="w-full overflow-x-auto px-3 pb-3 pt-1 select-none" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto flex w-max gap-2">
            {images.map((im, i) => (
              <button
                key={String(im.id ?? im.url) + i}
                onClick={() => setIndex(i)}
                className={
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-md ring-2 transition " +
                  (i === currentIndex ? "ring-emerald-400" : "ring-white/20 hover:ring-white/40")
                }
                aria-label={`Görsele git ${i + 1}`}
              >
                <img src={im.url} alt={im.alt ?? "thumbnail"} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Usage example:
// <LightboxGallery
//   itemImage={{ url: item.coverUrl, width: 1200, height: 900 }}
//   commentImages={item.comments.flatMap(c => c.images || [])}
//   isOpen={open}
//   onClose={() => setOpen(false)}
//   initialIndex={0}
// />
