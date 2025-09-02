'use client';

import { useEffect, useRef } from 'react';

import TrashIcon from '@/assets/icons/trash.svg';
import BookmarkIcon from '@/assets/icons/bookmark.svg';
import BookmarkSlashIcon from '@/assets/icons/bookmarkslash.svg';
import ListIcon from '@/assets/icons/list.svg';
import ReportIcon from '@/assets/icons/report.svg';
import EditIcon from '@/assets/icons/pencil.svg';

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

export type OptionsPopoverProps = {
  open: boolean;
  itemId: string;
  amAdmin?: boolean;
  isSaved: boolean;

  onClose: () => void;
  onDelete: (id: string) => void;          // admin
  onToggleSave: (id: string) => void;
  onReport: (id: string) => void;
  onShowInList: (id: string) => void;
  /** If true, hides the 'Listede göster' action */
  hideShowInList?: boolean;

  isOwner?: boolean;
  onEdit?: (id: string) => void;

  className?: string;
  style?: React.CSSProperties;
};

export default function OptionsPopover({
  open,
  itemId,
  amAdmin = false,
  isSaved,
  onClose,
  onDelete,
  onToggleSave,
  onReport,
  onShowInList,
  hideShowInList = false,
  isOwner = false,
  onEdit,
  className,
  style,
}: OptionsPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

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
      className={`rs-pop absolute right-0 top-full mt-2 z-[60] w-[min(16rem,calc(100vw-2rem))] max-h-[60vh] overflow-auto rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1 ${className || ''}`}
      style={style}
      role="menu"
      aria-label="Seçenekler menüsü"
    >
      {(isOwner || amAdmin) && (
        <>
          {isOwner && (
            <button
              className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
              onClick={() => { onClose(); onEdit && onEdit(itemId); }}
              role="menuitem"
            >
              <MaskedIcon src={EditIcon} className="w-[18px] h-[18px]" />
              <span>Düzenle</span>
            </button>
          )}

          <button
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            onClick={() => { onClose(); onDelete(itemId); }}
            role="menuitem"
          >
            <MaskedIcon src={TrashIcon} className="w-[18px] h-[18px] text-red-600 dark:text-red-400" />
            <span>Kaldır</span>
          </button>
          <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
        </>
      )}

      <button
        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
          isSaved
            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white'
        }`}
        onClick={() => { onClose(); onToggleSave(itemId); }}
        role="menuitem"
      >
        {isSaved ? (
          <>
            <MaskedIcon src={BookmarkSlashIcon} className="w-[18px] h-[18px] text-red-600 dark:text-red-400" />
            <span>Kaydedilenlerden Kaldır</span>
          </>
        ) : (
          <>
            <img src={(BookmarkIcon as any).src || (BookmarkIcon as any).default || '/assets/icons/bookmark.svg'} alt="" className="w-[18px] h-[18px] opacity-80 dark:invert" />
            <span>Kaydet</span>
          </>
        )}
      </button>

      {!hideShowInList && (
        <button
          className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
          onClick={() => { onClose(); onShowInList(itemId); }}
          role="menuitem"
        >
          <img src={(ListIcon as any).src || (ListIcon as any).default || '/assets/icons/list.svg'} alt="" className="w-[18px] h-[18px] dark:invert" />
          <span>Listede göster</span>
        </button>
      )}

      <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        onClick={() => { onClose(); onReport(itemId); }}
        role="menuitem"
      >
        <MaskedIcon src={ReportIcon} className="w-[18px] h-[18px] text-red-600 dark:text-red-400" />
        <span>Report</span>
      </button>
    </div>
  );
}