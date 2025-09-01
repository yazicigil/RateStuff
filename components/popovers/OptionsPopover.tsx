'use client';

import { useEffect, useRef } from 'react';

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
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <rect x="5" y="7" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 10v4M15 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 7h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="2"/>
            </svg>
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
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path d="M8 3h8a2 2 0 0 1 2 2v16l-6-4-6 4V5a2 2 0 0 1 2-2Z" fill="currentColor"/></svg>
            <span>Kaydedilenlerden Kaldır</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-7-5-7 5V4z" stroke="currentColor" strokeWidth="2" /></svg>
            <span>Kaydet</span>
          </>
        )}
      </button>

      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => { onClose(); onReport(itemId); }}
        role="menuitem"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path d="M6 21V5a2 2 0 0 1 2-2h7l-1 4h6l-1 4h-6l1 4h-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span>Report</span>
      </button>

      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => { onClose(); onShowInList(itemId); }}
        role="menuitem"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <rect x="4" y="6" width="16" height="2" rx="1" fill="currentColor" />
          <rect x="4" y="11" width="16" height="2" rx="1" fill="currentColor" />
          <rect x="4" y="16" width="16" height="2" rx="1" fill="currentColor" />
        </svg>
        <span>Listede göster</span>
      </button>
    </div>
  );
}