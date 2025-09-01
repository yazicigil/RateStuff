'use client';
import React from 'react';
import ClipboardIcon from '@/assets/icons/clipboard.svg';
import ClipboardDoneIcon from '@/assets/icons/clipboard_done.svg';
import ShareIcon from '@/assets/icons/share.svg';

export type SharePopoverProps = {
  open: boolean;
  itemId: string;
  itemName: string;
  onClose: () => void;
  onCopy: (id: string) => void;
  onShare: (id: string, name: string) => void;
  copiedShareId?: string | null;
};

export default function SharePopover({
  open,
  itemId,
  itemName,
  onClose,
  onCopy,
  onShare,
  copiedShareId,
}: SharePopoverProps) {
  if (!open) return null;
  const copied = copiedShareId === itemId;
  return (
    <div
      role="menu"
      aria-orientation="vertical"
      className="z-50 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => { onClose(); onCopy(itemId); }}
        role="menuitem"
      >
        {copied ? (
          <ClipboardDoneIcon className="w-[18px] h-[18px] stroke-current fill-none" />
        ) : (
          <ClipboardIcon className="w-[18px] h-[18px] stroke-current fill-none" />
        )}
        <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
      </button>

      <button
        className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => { onClose(); onShare(itemId, itemName); }}
        role="menuitem"
      >
        <ShareIcon className="w-[18px] h-[18px] stroke-current fill-none" />
        <span>Paylaş</span>
      </button>
    </div>
  );
}