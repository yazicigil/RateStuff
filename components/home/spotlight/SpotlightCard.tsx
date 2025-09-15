'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Tag from '@/components/common/Tag';
import Stars from '@/components/common/Stars';
import RatingPill from '@/components/common/RatingPill';
import SharePopover from '@/components/items/popovers/SharePopover';
import OptionsPopover from '@/components/items/popovers/OptionsPopover';
import CommentBox from '@/components/comments/CommentBox';
import CommentList from '@/components/comments/CommentList';
import ItemEditor, { ItemEditorValue } from '@/components/items/ItemEditor';
import { linkifyMentions } from '@/lib/text/linkifyMentions';
import LightboxGallery from '@/components/items/LightboxGallery';

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
    images?: Array<{ id?: string; url: string; width?: number; height?: number; blurDataUrl?: string; order?: number }>;
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

function slugifyTr(input?: string | null) {
  const s = (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return s || "brand";
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

  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  // Lightbox state for item + comment images
  const [lbOpen, setLbOpen] = React.useState(false);
  const [lbIndex, setLbIndex] = React.useState(0);
  // Hydrated full comment images for Lightbox (fetches authoritative list)
  const [lbCommentImages, setLbCommentImages] = React.useState<Array<{ id?: string; url: string; width?: number; height?: number; blurDataUrl?: string | null; order?: number | null }>>([]);

  const onSaveEditor = React.useCallback(async (v: ItemEditorValue) => {
    try {
      setSaving(true); setErr(null);
      const pUrl = (v.productUrl ?? '').trim();
      const body = {
        description: v.description,
        tags: (v.tags || []).slice(0, 3),
        imageUrl: v.imageUrl || '',
        productUrl: pUrl || ""
      };
      const res = await fetch(`/api/items/${item.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Kaydedilemedi');
      }
      setEditing(false);
      try { onCommentDone && onCommentDone(); } catch {}
    } catch (e: any) {
      setErr(e?.message || 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  }, [item?.id, onCommentDone]);

  const avg = (item.avgRating ?? item.avg ?? 0) as number;
  const ratingCount = item.count ?? 0;
  const isBrand = String(item.createdBy?.kind || "").toUpperCase() === "BRAND";
  const isOwner = (item.createdBy?.id || '') === (myId || '');
  const showProductCta = isBrand && typeof item.productUrl === 'string' && (item.productUrl || '').length > 0;

  const createdBySlug: string | null =
    (item.createdBy as any)?.slug ??
    (item as any)?.createdBySlug ??
    (item as any)?.brandSlug ??
    null;
  const brandSlug: string | null = isBrand
    ? (createdBySlug || slugifyTr(item.createdBy?.name))
    : null;

  // mount'ta görünen comment alanlarını ölç
  useEffect(() => {
    (item.comments || []).forEach((c) => {
      const el = commentTextRefs.current[c.id];
      if (el) setTimeout(() => measureTruncation(c.id), 0);
    });
  }, [item?.id]); // eslint-disable-line

  const others = (item.comments || []).filter((c) => c.user?.id !== myId);
  const rawMy = (item.comments || []).find((c) => c.user?.id === myId) || null;
  const my = rawMy ? ({
    ...rawMy,
    images: Array.isArray((rawMy as any)?.images) ? (rawMy as any).images : [],
  }) : null;
  const displayOthers = others
    .slice(0, showCount)
    .map((c: any) => ({
      ...c,
      images: Array.isArray(c?.images) ? c.images : [],
    }));
  const hasMoreOthers = others.length > showCount;

  // Build comment images array in visual order, with comment metadata for lightbox footer
  const commentImagesForLightbox = React.useMemo(() => {
    const list: Array<{
      id?: string;
      url: string;
      width?: number;
      height?: number;
      blurDataUrl?: string | null;
      order?: number | null;
      commentId?: string;
      commentUser?: { maskedName?: string | null; name?: string | null; avatarUrl?: string | null } | null;
      commentRating?: number | null;
      commentText?: string | null;
    }> = [];
    for (const c of (item.comments || [])) {
      const imgs = Array.isArray(c.images) ? [...c.images] : [];
      imgs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      for (const im of imgs) {
        if (!im?.url) continue;
        list.push({
          id: im.id,
          url: im.url,
          width: im.width,
          height: im.height,
          blurDataUrl: im.blurDataUrl ?? null,
          order: im.order ?? null,
          commentId: c.id,
          commentUser: {
            maskedName: maskName(c?.user?.name, false),
            name: c?.user?.name ?? null,
            avatarUrl: c?.user?.avatarUrl ?? null,
          },
          commentRating: typeof c?.rating === 'number' ? c.rating : null,
          commentText: typeof c?.text === 'string' ? c.text : null,
        });
      }
    }
    return list;
  }, [item?.comments]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/items/${encodeURIComponent(item.id)}/comments`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json().catch(() => null);
        const list: any[] = Array.isArray(j?.comments) ? j!.comments : [];
        const images: Array<{
          id?: string;
          url: string;
          width?: number;
          height?: number;
          blurDataUrl?: string | null;
          order?: number | null;
          commentId?: string;
          commentUser?: { maskedName?: string | null; name?: string | null; avatarUrl?: string | null } | null;
          commentRating?: number | null;
          commentText?: string | null;
        }> = [];
        for (const c of list) {
          const imgs = Array.isArray(c?.images) ? [...c.images] : [];
          imgs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          for (const im of imgs) {
            if (!im?.url) continue;
            images.push({
              id: im.id,
              url: im.url,
              width: im.width,
              height: im.height,
              blurDataUrl: im.blurDataUrl ?? null,
              order: im.order ?? null,
              commentId: c.id,
              commentUser: {
                maskedName: maskName(c?.user?.name, false),
                name: c?.user?.name ?? null,
                avatarUrl: c?.user?.avatarUrl ?? null,
              },
              commentRating: typeof c?.rating === 'number' ? c.rating : null,
              commentText: typeof c?.text === 'string' ? c.text : null,
            });
          }
        }
        if (!cancelled) setLbCommentImages(images);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [item?.id]);

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
      {!editing && (
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
              isOwner={isOwner}
              onEdit={() => setEditing(true)}
              onClose={() => setOpenMenuId(null)}
              onDelete={(id) => { try { onDelete(id); } finally { onClose(); } }}
              onToggleSave={onToggleSave}
              onReport={onReport}
              onShowInList={onShowInList}
            />
          </div>
        </div>
      )}

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
      {editing ? (
        <div className="mt-1">
          <ItemEditor
            title={item.name}
            initial={{
              imageUrl: item?.imageUrl ?? '',
              description: item?.description ?? '',
              tags: Array.isArray(item?.tags) ? [...item.tags] : [],
              productUrl: item?.productUrl ?? '',
            }}
            isBrand={isBrand}
            maxTags={3}
            maxDesc={140}
            saving={saving}
            error={err}
            onCancel={() => { setEditing(false); setErr(null); }}
            onSave={onSaveEditor}
          />
        </div>
      ) : (
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
                className="w-28 h-28 object-cover rounded-lg cursor-zoom-in"
                onClick={() => {
                  const hasAny = !!item.imageUrl || (lbCommentImages.length > 0 || commentImagesForLightbox.length > 0);
                  if (!hasAny) return;
                  setLbIndex(0); // item görseli varsa daima 0
                  setLbOpen(true);
                }}
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  if (t.src.endsWith('/default-item.svg')) return;
                  t.onerror = null;
                  t.src = '/default-item.svg';
                }}
              />
              {item.edited && !isBrand && (
                <span className="text-[11px] px-2 py-0.5 mt-1 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">düzenlendi</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {item.suspended && (
                <div className="mb-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200">
                  Askıda — yalnızca sen görüyorsun
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pr-16 md:pr-24">
                <h3
                  className="text-base md:text-lg font-semibold leading-snug title-wrap md-clamp2"
                  title={item.name}
                  lang="tr"
                >
                  {item.name}
                </h3>
                {!editing && showProductCta && (
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                      />
                    </svg>
                    <span>Ürüne git</span>
                  </a>
                )}
              </div>

            {item.description && (
  <p className="text-sm opacity-80 mt-1 whitespace-pre-wrap break-words">
     {linkifyMentions(item.description, { inline: true })}
   </p>
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
                    const display = isBrand ? (item.createdBy?.name || "Anonim") : maskName(item.createdBy?.name);
                    return (
                      <>
                        {isBrand && brandSlug ? (
                          <Link
                            href={`/brand/${brandSlug}`}
                            className="hover:underline underline-offset-2"
                            title={`${display} profiline git`}
                          >
                            {display}
                          </Link>
                        ) : (
                          <span>{display}</span>
                        )}
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
            itemImage={item.imageUrl ? { url: item.imageUrl } : null}
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
      )}
      {/* Lightbox for item + comment images */}
      <LightboxGallery
        itemImage={item.imageUrl ? { url: item.imageUrl } : undefined}
        commentImages={lbCommentImages.length > 0 ? lbCommentImages : commentImagesForLightbox}
        isOpen={lbOpen}
        onClose={() => setLbOpen(false)}
        index={lbIndex}
        onIndexChange={setLbIndex}
      />
    </div>
  );
}