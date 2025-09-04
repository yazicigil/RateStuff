'use client';

import React, { useEffect, useRef } from 'react';
import Tag from '@/components/common/Tag';
import Stars from '@/components/common/Stars';
import RatingPill from '@/components/common/RatingPill';
import SharePopover from '@/components/common/popovers/SharePopover';
import OptionsPopover from '@/components/common/popovers/OptionsPopover';
import CommentBox from '@/components/comments/CommentBox';
import CommentList from '@/components/comments/CommentList';

export type SpotlightItem = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  productUrl?: string | null;
  avg?: number | null;
  avgRating?: number | null;
  count?: number;
  edited?: boolean;
  suspended?: boolean;
  reportCount?: number;
  createdBy?: {
    id?: string;
    name?: string | null;
    avatarUrl?: string | null;
    verified?: boolean;
    kind?: "REGULAR" | "BRAND" | string | null;
  } | null;
  tags?: string[];
  comments: {
    id: string;
    text: string;
    rating?: number | null;
    score?: number | null;
    myVote?: 1 | -1 | 0 | null;
    edited?: boolean;
    user?: { id?: string; name?: string | null; avatarUrl?: string | null; verified?: boolean };
  }[];
};

function maskName(s?: string | null, isBrand?: boolean) {
  if (isBrand) return s || 'Anonim';
  if (!s) return 'Anonim';
  const raw = String(s).trim();
  if (!raw) return 'Anonim';
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.map((p) => p.charAt(0).toUpperCase() + '*'.repeat(Math.max(1, p.length - 1))).join(' ');
}

export type SpotlightCardProps = {
  item: SpotlightItem;
  amAdmin: boolean;
  myId?: string | null;
  saved: boolean;

  // popovers
  openShareId: string | null;
  setOpenShareId: (id: string | null) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  copiedShareId: string | null;

  // actions
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleSave: (id: string) => void;
  onReport: (id: string) => void;
  onShowInList: (id: string) => void;
  onCopyShare: (id: string) => void;
  onNativeShare: (id: string, name: string) => void;

  // navigation
  index: number;        // currentIndex
  count: number;        // filteredItems.length
  onPrev: () => void;
  onNext: () => void;
  animKey?: number;
  animClass?: string;   // '' | slideInFromLeft | slideInFromRight

  // comments/votes/editing (mevcut page state/handler’larını aynen geçiriyoruz)
  voteOnComment: (commentId: string, v: 1 | -1 | 0) => void;
  updateComment: (commentId: string, text: string, itemId?: string, rating?: number) => Promise<boolean>;
  deleteComment: (commentId: string) => void;

  expandedComments: Set<string>;
  setExpandedComments: (fn: (prev: Set<string>) => Set<string>) => void;
  truncatedComments: Set<string>;
  measureTruncation: (id: string) => void;
  commentTextRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;

  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
  editingCommentText: string;
  setEditingCommentText: (s: string) => void;
  editingCommentItem: string | null;
  setEditingCommentItem: (s: string | null) => void;
  editingCommentRating: number;
  setEditingCommentRating: (n: number) => void;

  showCount: number;                      // spotlightShowCount
  setShowCount: (fn: (n: number) => number) => void;

  /**
   * Yorum gönderildiğinde üst componentin listeyi/spotlight'ı tazelemesi için
   */
  onCommentDone?: () => void;
};

export default function SpotlightCard(props: SpotlightCardProps) {
  const {
    item, amAdmin, myId, saved,
    openShareId, setOpenShareId, openMenuId, setOpenMenuId, copiedShareId,
    onClose, onDelete, onToggleSave, onReport, onShowInList, onCopyShare, onNativeShare,
    index, count, onPrev, onNext, animKey, animClass,
    voteOnComment,
    expandedComments, setExpandedComments, truncatedComments, measureTruncation, commentTextRefs,
    showCount, setShowCount, onCommentDone,
  } = props;

  const avg = (item.avgRating ?? item.avg ?? 0) as number;
  const ratingCount = item.count ?? 0;
  const isBrand = String(item.createdBy?.kind || "").toUpperCase() === "BRAND";
  const showProductCta = isBrand && typeof item.productUrl === 'string' && (item.productUrl || '').length > 0;

  // mount'ta görünen comment alanlarını ölç
  useEffect(() => {
    (item.comments || []).forEach((c) => {
      const el = commentTextRefs.current[c.id];
      if (el) setTimeout(() => measureTruncation(c.id), 0);
    });
  }, [item?.id]); // eslint-disable-line

  const others = (item.comments || []).filter((c) => c.user?.id !== myId);
  const my = (item.comments || []).find((c) => c.user?.id === myId) || null;
  const displayOthers = others.slice(0, showCount);
  const hasMoreOthers = others.length > showCount;

  return (
    <div
      className={`scroll-mt-24 relative rounded-2xl border p-4 pl-12 pr-12 md:pl-14 md:pr-14 shadow-md bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800 ring-1 ring-black/5 dark:ring-white/5 flex flex-col transition-transform duration-150 ${item.suspended ? 'opacity-60 grayscale' : ''}`}
    >
      {/* Admin report sayacı */}
      {amAdmin && (item.reportCount ?? 0) > 0 && (
        <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40">
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden><path d="M12 3l9 18H3L12 3z" fill="currentColor"/></svg>
          <span className="tabular-nums">{item.reportCount}</span>
        </div>
      )}

      {/* Kapat */}
      <button
        className="rs-pop absolute top-3 right-3 z-30 w-8 h-8 grid place-items-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300"
        onClick={onClose}
        aria-label="Spotlight kartını kapat"
        title="Kapat"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Share / Options (yeni popoverlar) */}
      <div className="rs-pop absolute top-12 right-3 z-20 flex flex-col gap-2">
        {/* Share */}
        <div className="relative">
          <button
            className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
            aria-label="share"
            onClick={() => { setOpenShareId(openShareId === item.id ? null : item.id); setOpenMenuId(null); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <SharePopover
            open={openShareId === item.id}
            itemId={item.id}
            itemName={item.name}
            copiedShareId={copiedShareId}
            onCopy={onCopyShare}
            onShare={onNativeShare}
            onClose={() => setOpenShareId(null)}
          />
        </div>

        {/* Options */}
        <div className="relative">
          <button
            className="w-8 h-8 grid place-items-center rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/80"
            onClick={() => { setOpenMenuId(openMenuId === item.id ? null : item.id); setOpenShareId(null); }}
            aria-label="options"
          >
            ⋯
          </button>

          <OptionsPopover
            open={openMenuId === item.id}
            itemId={item.id}
            amAdmin={amAdmin}
            isSaved={saved}
            onClose={() => setOpenMenuId(null)}
            onDelete={onDelete}
            onToggleSave={onToggleSave}
            onReport={onReport}
            onShowInList={onShowInList}
          />
        </div>
      </div>

      {/* Gezinme okları */}
      {index >= 0 && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border bg-white/80 dark:bg-gray-800/80 p-2 shadow disabled:opacity-40"
            onClick={onPrev}
            disabled={index <= 0}
            aria-label="Önceki öğe"
            title="Önceki (←)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border bg-white/80 dark:bg-gray-800/80 p-2 shadow disabled:opacity-40"
            onClick={onNext}
            disabled={index === count - 1}
            aria-label="Sonraki öğe"
            title="Sonraki (→)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      {/* İçerik + animasyon */}
      <div key={animKey} className={animClass || ''} style={{ willChange: 'transform' }}>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center shrink-0 w-28">
            <img
              src={item.imageUrl || '/default-item.svg'}
              alt={item.name || 'item'}
              width={112}
              height={112}
              decoding="async"
              loading="eager"
              className="w-28 h-28 object-cover rounded-lg"
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                if (t.src.endsWith('/default-item.svg')) return;
                t.onerror = null;
                t.src = '/default-item.svg';
              }}
            />
            {item.edited && (
              <span className="text-[11px] px-2 py-0.5 mt-1 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">düzenlendi</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {item.suspended && (
              <div className="mb-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200">
                Askıda — yalnızca sen görüyorsun
              </div>
            )}

            <h3 className="text-base md:text-lg font-semibold leading-snug pr-16 md:pr-24 title-wrap md-clamp2" title={item.name} lang="tr">
              {item.name}
            </h3>

            {item.description && (
              <p className="text-sm opacity-80 mt-1 break-words">{item.description}</p>
            )}

            {item.createdBy && (
              <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                {item.createdBy.avatarUrl ? (
                  <img
                    src={item.createdBy.avatarUrl}
                    alt={maskName(item.createdBy.name, String(item.createdBy?.kind || "").toUpperCase() === "BRAND")}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px]">
                    {(maskName(item.createdBy.name, String(item.createdBy?.kind || "").toUpperCase() === "BRAND") || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                {(() => {
                  const isBrand = String(item.createdBy?.kind || "").toUpperCase() === "BRAND";
                  const display = isBrand ? (item.createdBy?.name || "Anonim") : maskName(item.createdBy?.name);
                  return (
                    <>
                      <span>{display}</span>
                      {isBrand && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="inline-block ml-1 w-4 h-4 align-middle"
                        >
                          <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                          <path
                            d="M8.5 12.5l2 2 4-4"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Stars rating={avg} readOnly />
              <RatingPill avg={avg} count={ratingCount} />
            </div>
            {showProductCta && (
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={item.productUrl as string}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-full shadow text-sm font-medium focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#6827CD',
                    color: '#fff',
                    ['--tw-ring-color' as any]: '#6827CD'
                  }}
                  aria-label="Ürüne git"
                  title="Ürüne git"
                >
                  <img src="/assets/icon/shop.svg" alt="" className="w-4 h-4 filter invert" />
                  <span>Ürüne git</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {!!(item.tags && item.tags.length) && (
          <div className="mt-2 pt-2 border-t dark:border-gray-800">
            <div className="w-full flex flex-wrap items-center gap-1 justify-start text-left">
              {item.tags.slice(0, 10).map((t) => (
                <Tag key={t} label={t} className="ml-0 inline-flex" />
              ))}
            </div>
          </div>
        )}

        {!!(item.comments && item.comments.length) && <div className="mt-3 border-t dark:border-gray-800" />}

        {/* Başkalarının yorumları (CommentList) */}
        <CommentList
          itemId={item.id}
          myId={myId}
          comments={displayOthers}
          totalCount={(item.comments || []).length}
          onVote={(commentId, next) => voteOnComment(commentId, next)}
        />

        {hasMoreOthers && (
          <div className="pt-1">
            <button
              type="button"
              className="text-[12px] underline opacity-75 hover:opacity-100"
              onClick={() => setShowCount((n) => n + 7)}
            >
              daha fazla gör
            </button>
          </div>
        )}

        <div className="mt-3 pt-3 border-t dark:border-gray-800">
          <CommentBox
            itemId={item.id}
            myComment={my || undefined}
            onDone={() => {
              try { onCommentDone && onCommentDone(); } catch {}
            }}
            initialRating={0}
          />
        </div>
      </div>
    </div>
  );
}