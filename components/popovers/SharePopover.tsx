'use client';

import { useEffect, useRef } from 'react';

export type SharePopoverProps = {
  /** Menü açık mı */
  open: boolean;
  /** Hangi item için */
  itemId: string;
  /** Başlıkta kullanılacak isim (native share için) */
  itemName: string;
  /** Kapatıcı */
  onClose: () => void;

  /** “Kopyala” aksiyonu — dışarıda handleCopyShare ile bağlı */
  onCopy: (id: string) => void;
  /** “Paylaş” aksiyonu — dışarıda nativeShare ile bağlı */
  onShare: (id: string, name: string) => void;

  /** Kopyalandı! yazısını göstermek için (id eşleşirse) */
  copiedShareId?: string | null;

  /** Pozisyon için: menüyü bağlayacağın buton sarmalayıcısı relative ise top/right ile hizalanır */
  className?: string;
  style?: React.CSSProperties;
};

export default function SharePopover({
  open,
  itemId,
  itemName,
  onClose,
  onCopy,
  onShare,
  copiedShareId,
  className,
  style,
}: SharePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Dış tık ile kapat (global doc listener yerine küçük alan dinleyicisi)
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (ref.current && (ref.current.contains(t) || t.closest('.rs-pop'))) return;
      onClose();
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`rs-pop absolute right-10 top-0 z-30 w-44 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1 ${className || ''}`}
      style={style}
      role="menu"
      aria-label="Paylaş menüsü"
    >
      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => onCopy(itemId)}
        role="menuitem"
      >
        {copiedShareId === itemId ? (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M5 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )}
        <span>{copiedShareId === itemId ? 'Kopyalandı!' : 'Kopyala'}</span>
      </button>

      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => { onShare(itemId, itemName); onClose(); }}
        role="menuitem"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 16V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8.5 7.5L12 4l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 10h-.5A1.5 1.5 0 0 0 4 11.5v7A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18.5 10H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span>Paylaş</span>
      </button>
    </div>
  );
}