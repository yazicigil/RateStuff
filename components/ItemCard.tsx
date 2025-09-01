'use client';
import React, { useMemo } from 'react';
import Stars from '@/components/Stars';
import Tag from '@/components/Tag';
import RatingPill from '@/components/RatingPill';
import SharePopover from '@/components/popovers/SharePopover';
import OptionsPopover from '@/components/popovers/OptionsPopover';

export interface ItemCardProps {
  item: any;                       // backend’den gelen item (id, name, description, imageUrl, avg/avgRating, count, tags, createdBy, edited, suspended, reportCount)
  saved: boolean;
  amAdmin?: boolean;
  // popover states are lifted to page.tsx (tekil id modeli)
  openShareId: string | null;
  setOpenShareId: (id: string | null) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  copiedShareId?: string | null;

  // actions (page.tsx’te mevcut)
  onOpenSpotlight: (id: string) => void;
  onToggleSave: (id: string) => void;
  onReport: (id: string) => void;
  onDelete?: (id: string) => void;
  onCopyShare: (id: string) => void;
  onNativeShare: (id: string, name: string) => void;
  onShowInList: (id: string) => void;

  // tag filter helpers
  selectedTags: Set<string>;
  onToggleTag: (t: string) => void;
  onResetTags: () => void;
}

function maskName(s?: string | null, verified?: boolean) {
  if (verified) return s || 'Anonim';
  if (!s) return 'Anonim';
  const parts = String(s).trim().split(/\s+/).filter(Boolean);
  return parts.map(p => p[0]?.toUpperCase() + '*'.repeat(Math.max(1, p.length - 1))).join(' ');
}

export default function ItemCard({
  item: i, saved, amAdmin,
  openShareId, setOpenShareId, openMenuId, setOpenMenuId, copiedShareId,
  onOpenSpotlight, onToggleSave, onReport, onDelete, onCopyShare, onNativeShare,
  selectedTags, onToggleTag,
}: ItemCardProps) {
  const avg = i?.avgRating ?? i?.avg ?? 0;
  const savedClass = saved ? 'ring-2 ring-emerald-400' : '';
  const verified = Boolean((i?.createdBy as any)?.verified);

  const handleShareClick = () => { setOpenShareId(openShareId === i.id ? null : i.id); setOpenMenuId(null); };
  const handleMenuClick  = () => { setOpenMenuId(openMenuId === i.id ? null : i.id); setOpenShareId(null); };

  const creatorName = useMemo(
    () => maskName(i?.createdBy?.name, verified),
    [i?.createdBy?.name, verified]
  );

  return (
    <div
      className={`relative rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-col transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md ${savedClass} ${i?.suspended ? 'opacity-60 grayscale' : ''}`}
    >
      {amAdmin && ((i as any).reportCount ?? 0) > 0 && (
        <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40">
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 18H3L12 3z" fill="currentColor"/></svg>
          <span className="tabular-nums">{(i as any).reportCount}</span>
        </div>
      )}

      {/* TOP RIGHT: Share + Options (buttons) */}
      <div className="rs-pop absolute top-3 right-3 z-20 flex flex-col gap-2">
        <div className="relative">
          <button
            className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
            aria-label="share"
            onClick={handleShareClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <SharePopover
            open={openShareId === i.id}
            itemId={i.id}
            itemName={i.name}
            onClose={() => setOpenShareId(null)}
            onCopy={onCopyShare}
            onShare={onNativeShare}
            copiedShareId={copiedShareId}
          />
        </div>

        <div className="relative">
          <button
            className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
            onClick={handleMenuClick}
            aria-label="options"
          >
            ⋯
          </button>
          <OptionsPopover
            open={openMenuId === i.id}
            itemId={i.id}
            amAdmin={!!amAdmin}
            isSaved={saved}
            onClose={() => setOpenMenuId(null)}
            onDelete={(id) => onDelete?.(id)}
            onToggleSave={(id) => onToggleSave(id)}
            onReport={(id) => onReport(id)}
            onShowInList={() => {}}
            hideShowInList
          />
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center shrink-0 w-28">
            <button
              type="button"
              onClick={() => onOpenSpotlight(i.id)}
              className="rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label={`${i.name} spotlight'ı aç`}
              title={`${i.name} spotlight'ı aç`}
            >
              <img src={i.imageUrl || '/default-item.svg'} alt={i.name || 'item'} className="w-28 h-28 object-cover rounded-lg" />
            </button>
            {i.edited && (
              <span className="text-[11px] px-2 py-0.5 mt-1 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">
                düzenlendi
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {i?.suspended && (
              <div className="mb-1 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.335-.214 3.007-1.742 3.007H3.48c-1.528 0-2.492-1.672-1.742-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                Askıda — yalnızca sen görüyorsun
              </div>
            )}

            <h3 className="text-sm font-medium leading-tight pr-16 md:pr-24 title-wrap md-clamp2" title={i.name} lang="tr">
              <button
                type="button"
                onClick={() => onOpenSpotlight(i.id)}
                className="text-left hover:underline underline-offset-2 decoration-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded"
                aria-label={`${i.name} spotlight'ı aç`}
                title={`${i.name} spotlight'ı aç`}
              >
                {i.name}
              </button>
            </h3>
            {i.description && <p className="text-sm opacity-80 mt-1 break-words">{i.description}</p>}

            {i.createdBy && (
              <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                {i.createdBy.avatarUrl ? (
                  <img
                    src={i.createdBy.avatarUrl}
                    alt={creatorName || 'u'}
                    className="w-5 h-5 rounded-full object-cover"
                    title={creatorName || 'u'}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px]" title={creatorName || 'u'}>
                    {(creatorName || 'u').charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{creatorName}</span>
                {verified && (
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-4 h-4 align-middle">
                    <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                    <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            )}

            {/* Stars + Rating pill */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Stars rating={avg} readOnly />
              <RatingPill avg={i.avgRating ?? i.avg} count={i.count} />
            </div>
          </div>
        </div>

        {/* Tags */}
        {Array.isArray(i.tags) && i.tags.length > 0 && (
          <div className="mt-2 pt-2 border-t dark:border-gray-800">
            <div className="w-full flex flex-wrap items-center gap-1 justify-start">
              {i.tags.slice(0, 10).map((t: string) => (
                <Tag
                  key={t}
                  label={t}
                  className="inline-flex"
                  active={selectedTags.has(t)}
                  onClick={() => onToggleTag(t)}
                  onDoubleClick={() => onToggleTag(t)} // (page tarafında double-click tümünü temizlemeyi handle ediyorsun)
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}