'use client';

import { useEffect, useRef } from 'react';

import ClipboardIcon from '@/assets/icons/clipboard.svg';
import ClipboardDoneIcon from '@/assets/icons/clipboard_done.svg';
import ShareIcon from '@/assets/icons/share.svg';

// SVG helper: accepts either a React component (SVGR) or a URL module
function SvgIcon(Icon: any, fallbackPath: string, props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  if (typeof Icon === 'function') {
    // SVGR component
    const Comp = Icon as React.FC<any>;
    return <Comp {...props} />;
  }
  // URL/static import fallback
  const src = (Icon && (Icon.src || Icon.default)) || fallbackPath;
  return <img src={src as string} alt="" className={props.className} />;
}

// Masked icon helper for URL-based svgs so we can color via currentColor
function MaskedIcon({ src, className }: { src: any; className?: string }) {
  const url = typeof src === 'string' ? src : (src && (src.src || (src as any).default)) || '';
  const style: React.CSSProperties = {
    WebkitMaskImage: `url(${url})`,
    maskImage: `url(${url})`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    backgroundColor: 'currentColor',
    display: 'inline-block',
  };
  return <span aria-hidden className={className} style={style} />;
}

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
      className={`rs-pop absolute right-0 top-full mt-2 z-[60] w-[min(14rem,calc(100vw-2rem))] max-h-[60vh] overflow-auto rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1 ${className || ''}`}
      style={style}
      role="menu"
      aria-label="Paylaş menüsü"
    >
      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white"
        onClick={() => onCopy(itemId)}
        role="menuitem"
      >
        {copiedShareId === itemId ? (
          <img src={(ClipboardDoneIcon as any).src || (ClipboardDoneIcon as any).default || '/assets/icons/clipboard_done.svg'} alt="" className="w-[18px] h-[18px] dark:invert" />
        ) : (
          <img src={(ClipboardIcon as any).src || (ClipboardIcon as any).default || '/assets/icons/clipboard.svg'} alt="" className="w-[18px] h-[18px] dark:invert" />
        )}
        <span>{copiedShareId === itemId ? 'Kopyalandı!' : 'Kopyala'}</span>
      </button>

      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white"
        onClick={() => { onShare(itemId, itemName); onClose(); }}
        role="menuitem"
      >
        <img src={(ShareIcon as any).src || (ShareIcon as any).default || '/assets/icons/share.svg'} alt="" className="w-[18px] h-[18px] dark:invert" />
        <span>Paylaş</span>
      </button>
    </div>
  );
}