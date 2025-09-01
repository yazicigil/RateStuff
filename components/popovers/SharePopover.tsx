'use client';

import { useEffect, useRef } from 'react';

import ClipboardIcon from '@/assets/icons/clipboard.svg';
import ClipboardDoneIcon from '@/assets/icons/clipboard_done.svg';
import ShareIcon from '@/assets/icons/share.svg';

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
          <ClipboardDoneIcon className="w-[18px] h-[18px] stroke-current fill-none" />
        ) : (
          <ClipboardIcon className="w-[18px] h-[18px] stroke-current fill-none" />
        )}
        <span>{copiedShareId === itemId ? 'Kopyalandı!' : 'Kopyala'}</span>
      </button>

      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => { onShare(itemId, itemName); onClose(); }}
        role="menuitem"
      >
        <ShareIcon className="w-[18px] h-[18px] stroke-current fill-none" />
        <span>Paylaş</span>
      </button>
    </div>
  );
}