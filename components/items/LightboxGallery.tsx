'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

const maskDisplayName = (masked?: string | null, name?: string | null) => {
  if (masked && masked.trim()) return masked;
  const n = (name || '').trim();
  if (!n) return '***';
  const first = n[0];
  return `${first}${'•'.repeat(Math.max(2, Math.min(6, n.length - 1)))}`;
};

const displayNameWithBrand = (
  user?: { maskedName?: string | null; name?: string | null; userkind?: string | null }
) => {
  if (!user) return '***';
  // if brand, never mask; prefer real name then masked fallback
  if ((user.userkind || '').toLowerCase() === 'brand') {
    return (user.name && user.name.trim()) || (user.maskedName && user.maskedName.trim()) || '***';
  }
  return maskDisplayName(user.maskedName, user.name);
};

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
  // optional comment metadata for footer
  commentId?: string;
  commentUser?: { maskedName?: string | null; name?: string | null; avatarUrl?: string | null; userkind?: string | null; verified?: boolean | null } | null;
  commentRating?: number | null;
  commentText?: string | null;
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;
  if (total === 0) return null;

  const current = images[currentIndex];

  const currentMeta = {
    user: current?.commentUser || null,
    rating: typeof current?.commentRating === 'number' ? (current!.commentRating as number) : null,
    text: (current as any)?.commentText ?? null,
  } as const;

  return createPortal(
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex flex-col"
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
        <img
          key={String(current.id ?? current.url)}
          src={current.url}
          alt={current.alt ?? "Görsel"}
          className="h-[80vh] max-h-[80vh] w-auto max-w-[92vw] object-contain rounded-lg shadow-2xl"
          draggable={false}
        />
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

      {total > 1 && (
        <div className="w-full overflow-x-auto px-3 pb-3 pt-1 select-none" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto flex w-max gap-2">
            {images.map((im, i) => (
              <button
                key={String(im.id ?? im.url) + i}
                onClick={() => setIndex(i)}
                className={
                  "relative h-16 shrink-0 overflow-hidden rounded-md ring-2 transition inline-flex items-center justify-center px-1 " +
                  (i === currentIndex ? "ring-emerald-400" : "ring-white/20 hover:ring-white/40")
                }
                aria-label={`Görsele git ${i + 1}`}
              >
                <img src={im.url} alt={im.alt ?? "thumbnail"} className="h-16 w-auto object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* related comment meta */}
      {currentMeta.user && (
        <div className="px-3 pb-4">
          <div className="mx-auto flex w-full max-w-[880px] items-center gap-2 text-white/90">
            <img
              src={currentMeta.user?.avatarUrl || '/avatar.png'}
              alt="avatar"
              className="h-6 w-6 rounded-full object-cover ring-1 ring-white/20"
            />
            <span className="text-sm opacity-90 inline-flex items-center gap-1">
              {displayNameWithBrand(currentMeta.user as any)}
              {((currentMeta.user?.userkind || '').toLowerCase() === 'brand') && (
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block align-middle">
                  <circle cx="12" cy="12" r="9" fill="#3B82F6"></circle>
                  <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              )}
            </span>
            {typeof currentMeta.rating === 'number' && (
              <span className="ml-1 inline-flex items-center gap-1 bg-white/15 text-white text-[11px] px-2 py-0.5 rounded-full">
                <span className="leading-none">{currentMeta.rating}★</span>
              </span>
            )}
          </div>
        </div>
      )}
      {currentMeta.text && (
        <div className="px-3 pb-6 -mt-2">
          <div className="mx-auto w-full max-w-[880px] text-white/85">
            <p className="text-sm whitespace-pre-wrap break-words">{String(currentMeta.text)}</p>
          </div>
        </div>
      )}
    </div>,
    document.body
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
