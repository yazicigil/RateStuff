'use client';

import { useEffect, useRef } from 'react';

import TrashIcon from '@/assets/icons/trash.svg';
import BookmarkIcon from '@/assets/icons/bookmark.svg';
import ListIcon from '@/assets/icons/list.svg';
import ReportIcon from '@/assets/icons/report.svg';

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
      className={`rs-pop absolute right-10 top-0 z-30 w-56 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1 ${className || ''}`}
      style={style}
      role="menu"
      aria-label="Seçenekler menüsü"
    >
      {amAdmin && (
        <>
          <button
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            onClick={() => { onClose(); onDelete(itemId); }}
            role="menuitem"
          >
            {SvgIcon(TrashIcon, '/assets/icons/trash.svg', { className: 'w-[18px] h-[18px] stroke-current fill-none' })}
            <span>Kaldır</span>
          </button>
          <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
        </>
      )}

      <button
        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
          isSaved
            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={() => { onClose(); onToggleSave(itemId); }}
        role="menuitem"
      >
        {isSaved ? (
          <>
            {SvgIcon(BookmarkIcon, '/assets/icons/bookmark.svg', { className: 'w-[18px] h-[18px] fill-current stroke-current' })}
            <span>Kaydedilenlerden Kaldır</span>
          </>
        ) : (
          <>
            {SvgIcon(BookmarkIcon, '/assets/icons/bookmark.svg', { className: 'w-[18px] h-[18px] stroke-current fill-none' })}
            <span>Kaydet</span>
          </>
        )}
      </button>

      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        onClick={() => { onClose(); onReport(itemId); }}
        role="menuitem"
      >
        {SvgIcon(ReportIcon, '/assets/icons/report.svg', { className: 'w-[18px] h-[18px] stroke-current fill-none' })}
        <span>Report</span>
      </button>

      {!hideShowInList && (
        <button
          className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => { onClose(); onShowInList(itemId); }}
          role="menuitem"
        >
          {SvgIcon(ListIcon, '/assets/icons/list.svg', { className: 'w-[18px] h-[18px] stroke-current fill-none' })}
          <span>Listede göster</span>
        </button>
      )}
    </div>
  );
}