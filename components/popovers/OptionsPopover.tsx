'use client';
import React from 'react';
import TrashIcon from '@/assets/icons/trash.svg';
import BookmarkIcon from '@/assets/icons/bookmark.svg';
import ListIcon from '@/assets/icons/list.svg';
import ReportIcon from '@/assets/icons/report.svg';

export type OptionsPopoverProps = {
  open: boolean;
  itemId: string;
  amAdmin?: boolean;
  isSaved: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onToggleSave: (id: string) => void;
  onReport: (id: string) => void;
  onShowInList: (id: string) => void;
  /** If true, hides the 'Listede göster' action */
  hideShowInList?: boolean;
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
}: OptionsPopoverProps) {
  if (!open) return null;
  return (
    <div
      role="menu"
      aria-orientation="vertical"
      className="z-50 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Kaydet / Kaldır */}
      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => { onClose(); onToggleSave(itemId); }}
        role="menuitem"
      >
        {isSaved ? (
          <BookmarkIcon className="w-[18px] h-[18px] fill-current stroke-current" />
        ) : (
          <BookmarkIcon className="w-[18px] h-[18px] stroke-current fill-none" />
        )}
        <span>{isSaved ? 'Kaydedilenlerden kaldır' : 'Kaydet'}</span>
      </button>

      {/* Listede göster */}
      {!hideShowInList && (
        <button
          className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => { onClose(); onShowInList(itemId); }}
          role="menuitem"
        >
          <ListIcon className="w-[18px] h-[18px] stroke-current fill-none" />
          <span>Listede göster</span>
        </button>
      )}

      {/* Report (kırmızı temalı) */}
      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        onClick={() => { onClose(); onReport(itemId); }}
        role="menuitem"
      >
        <ReportIcon className="w-[18px] h-[18px] stroke-current fill-none" />
        <span>Report</span>
      </button>

      {/* Admin: Kaldır */}
      {amAdmin && onDelete && (
        <button
          className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          onClick={() => { onClose(); onDelete(itemId); }}
          role="menuitem"
        >
          <TrashIcon className="w-[18px] h-[18px] stroke-current fill-none" />
          <span>Kaldır</span>
        </button>
      )}
    </div>
  );
}