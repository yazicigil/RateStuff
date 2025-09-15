'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import TrashIcon from '@/assets/icons/trash.svg';
import BookmarkIcon from '@/assets/icons/bookmark.svg';
import BookmarkSlashIcon from '@/assets/icons/bookmarkslash.svg';
import ListIcon from '@/assets/icons/list.svg';
import ReportIcon from '@/assets/icons/report.svg';
import EditIcon from '@/assets/icons/pencil.svg';
import { AtSymbolIcon } from '@heroicons/react/24/outline';
import { useMentionsContext } from '@/components/brand/MentionsContext';

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
  onHideMention?: (id: string) => void;

  isMentionsContext?: boolean;

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
  isMentionsContext = false,
  onEdit,
  onHideMention,
  className,
  style,
}: OptionsPopoverProps) {
  const ctx = useMentionsContext();
  const isMentions = ctx?.isMentions === true;
  const brandIdFromCtx = ctx?.brandId;
  const brandSlugFromCtx = (ctx as any)?.brandSlug as string | undefined;

  function inferBrandSlugFromLocation(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    const m = window.location.pathname.match(/\/brand\/([^\/\?]+)/);
    return m?.[1];
  }

  async function handleHideFromMentions() {
    try {
      if (onHideMention) {
        return onHideMention(itemId);
      }
      const payload: Record<string, any> = { itemId: Number(itemId) };
      const slug = brandSlugFromCtx || inferBrandSlugFromLocation();
      if (brandIdFromCtx) payload.brandId = brandIdFromCtx;
      if (!payload.brandId && slug) payload.brandSlug = slug;
      if (!payload.brandId && !payload.brandSlug) {
        console.warn('[OptionsPopover] Missing brand context for hide:', { itemId });
        return;
      }
      const res = await fetch('/api/mentions/hide', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[OptionsPopover] hide failed', res.status, text);
      }
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rs:mention-hidden', { detail: { itemId } }));
      }
    }
  }

  const ref = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (ref.current && (ref.current.contains(t) || t.closest('.rs-pop'))) return;
      setConfirmDelete(false);
      onClose();
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open, onClose]);

  useEffect(() => { if (open) setConfirmDelete(false); }, [open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`rs-pop absolute right-0 top-full mt-2 z-[60] w-[min(16rem,calc(100vw-2rem))] max-h-[60vh] overflow-auto rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1 ${className || ''}`}
      style={style}
      role="menu"
      aria-label="Seçenekler menüsü"
    >
      {( (isOwner || amAdmin) && (isMentionsContext || isMentions) ) && (
        <>
          <button
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
            onClick={() => { onClose(); handleHideFromMentions(); }}
            role="menuitem"
          >
            <AtSymbolIcon className="w-[18px] h-[18px]" />
            <span>Bahsetmelerden Kaldır</span>
          </button>
          <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
        </>
      )}
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
            className={
              'w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ' +
              (confirmDelete
                ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20'
                : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20')
            }
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
              } else {
                // confirm and delete
                setConfirmDelete(false);
                onDelete(itemId);
                onClose();
              }
            }}
            role="menuitem"
          >
            {confirmDelete ? (
              // check icon inline (green themed via currentColor)
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <MaskedIcon src={TrashIcon} className="w-[18px] h-[18px]" />
            )}
            <span>{confirmDelete ? 'Onayla' : 'Kaldır'}</span>
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