// components/brand/BrandItemsGrid.tsx
'use client';
import { useMemo, useState } from 'react';
import ItemCard from '@/components/home/ItemCard';

interface Props {
  items: any[];
  myId: string;
  amAdmin: boolean;
}

export default function BrandItemsGrid({ items, myId, amAdmin }: Props) {
  const [openShareId, setOpenShareId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const selectedTags = useMemo(() => new Set<string>(), []);

  const noop = () => {};
  const onCopyShare = (id: string) => setCopiedShareId(id);

  return (
    <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((it) => (
        <div key={it.id} className="min-w-0">
          <ItemCard
            item={it}
            saved={false}
            amAdmin={amAdmin}
            myId={myId}
            openShareId={openShareId}
            setOpenShareId={setOpenShareId}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            copiedShareId={copiedShareId}
            onOpenSpotlight={noop}
            onToggleSave={noop}
            onReport={noop}
            onDelete={noop}
            onCopyShare={onCopyShare}
            onNativeShare={noop}
            onShowInList={noop}
            onVoteComment={noop as any}
            onItemChanged={noop}
            selectedTags={selectedTags}
            onToggleTag={noop}
            onResetTags={noop}
            showComments={false}
            showCommentBox={false}
          />
        </div>
      ))}
    </div>
  );
}
