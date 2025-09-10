'use client';
import React, { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Stars from '@/components/common/Stars';
import Tag from '@/components/common/Tag';
import RatingPill from '@/components/common/RatingPill';
import SharePopover from '@/components/items/popovers/SharePopover';
import OptionsPopover from '@/components/items/popovers/OptionsPopover';
import CommentList from '@/components/comments/CommentList';
import CommentBox from '@/components/comments/CommentBox';
import ItemEditor, { ItemEditorValue } from '@/components/items/ItemEditor';
import Link from 'next/link';

export interface ItemCardProps {
  item: any;                       // backend’den gelen item (id, name, description, imageUrl, avg/avgRating, count, tags, createdBy, edited, suspended, reportCount)
  saved: boolean;
  amAdmin?: boolean;
  myId?: string | null;
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
  onVoteComment: (commentId: string, nextValue: 1 | 0 | -1) => void;
  /** Yorum eklendi/silindi/güncellendi gibi durumlarda listeyi tazelemek için */
  onItemChanged?: () => void;

  // tag filter helpers
  selectedTags: Set<string>;
  onToggleTag: (t: string) => void;
  onResetTags: () => void;
  /** alt kısımdaki listeyi gizlemek için */
  showComments?: boolean;          // default: true
  /** alt kısımdaki yorum kutusunu gizlemek için */
  showCommentBox?: boolean;        // default: true
}

function maskName(s?: string | null, isBrand?: boolean, isVerified?: boolean) {
  if (isBrand || isVerified) return s || 'Anonim';
  if (!s) return 'Anonim';
  const parts = String(s).trim().split(/\s+/).filter(Boolean);
  return parts.map(p => p[0]?.toUpperCase() + '*'.repeat(Math.max(1, p.length - 1))).join(' ');
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

export default function ItemCard({
  item: i, saved, amAdmin, myId,
  openShareId, setOpenShareId, openMenuId, setOpenMenuId, copiedShareId,
  onOpenSpotlight, onToggleSave, onReport, onDelete, onCopyShare, onNativeShare, onVoteComment, onItemChanged,
  selectedTags, onToggleTag, onResetTags,
  showComments = true,
  showCommentBox = true,
}: ItemCardProps) {
  const avg = i?.avgRating ?? i?.avg ?? 0;
  // be resilient to various API shapes (some lists don't include createdBy.kind directly)
  const createdByAny = (i as any)?.createdBy || (i as any)?.user || {};
  const rawKind =
    (createdByAny?.kind) ??
    (i as any)?.createdByKind ??
    (i as any)?.user?.kind ??
    (i as any)?.kind ??
    null;
  const isBrand =
    typeof rawKind === 'string'
      ? rawKind.toUpperCase() === 'BRAND'
      : !!(createdByAny?.isBrand === true); // allow boolean flags if present
  const isVerified =
    Boolean(createdByAny?.verified) ||
    isBrand ||
    Boolean((i as any)?.createdByVerified === true);
  const productUrl: string | null = (i as any)?.productUrl || null;
  // Show product link CTA whenever a valid URL exists (brand olup olmamasına bakmadan)
  const showProductCta = typeof productUrl === 'string' && productUrl.length > 0;
  const ownerId = (
    (i as any)?.createdById ??
    (i as any)?.createdByUserId ??
    i?.createdBy?.id ??
    (i as any)?.ownerId ??
    (i as any)?.userId ??
    (i as any)?.createdBy?.userId ??
    (i as any)?.user?.id ??
    (i as any)?.user?.userId ??
    null
  ) as string | null;
  const isOwner = myId && ownerId ? String(myId) === String(ownerId) : false;

  const creatorNameRaw: string | null | undefined =
    i?.createdBy?.name ??
    i?.createdBy?.maskedName ??
    i?.createdByName ??
    (i as any)?.createdByMaskedName ??
    null;
  const creatorAvatarRaw: string | null | undefined =
    i?.createdBy?.avatarUrl ??
    (i as any)?.createdByAvatarUrl ??
    null;

  // public brand profile slug (prefer backend-provided, fallback to name)
  const createdBySlug: string | null =
    (createdByAny as any)?.slug ??
    (i as any)?.createdBySlug ??
    (i as any)?.brandSlug ??
    null;
  const brandSlug: string | null = isBrand
    ? (createdBySlug || (creatorNameRaw ? slugifyTr(creatorNameRaw) : null))
    : null;

  const handleShareClick = () => { setOpenShareId(openShareId === i.id ? null : i.id); setOpenMenuId(null); };
  const handleMenuClick  = () => { setOpenMenuId(openMenuId === i.id ? null : i.id); setOpenShareId(null); };

  const creatorName = useMemo(() => {
    const masked = maskName(creatorNameRaw, isBrand, isVerified);
    if (!masked && isOwner) return 'Ben';
    return masked;
  }, [creatorNameRaw, isBrand, isVerified, isOwner]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSaveEditor = useCallback(async (v: ItemEditorValue) => {
    try {
      setSaving(true); setErr(null);
      const pUrl = (v.productUrl ?? '').trim();
      const body = {
        description: v.description,
        tags: (v.tags || []).slice(0, 3),
        imageUrl: v.imageUrl || '',
        productUrl: pUrl || ""
      };
      const res = await fetch(`/api/items/${i.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Kaydedilemedi');
      }
      setEditing(false);
      onItemChanged && onItemChanged();
    } catch (e: any) {
      setErr(e?.message || 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  }, [i?.id, onItemChanged]);

  const allComments = Array.isArray(i?.comments) ? (i.comments as any[]) : [];
  const myComment = myId ? (allComments.find((c: any) => c?.user?.id === myId) || null) : null;
  const otherComments = myId ? allComments.filter((c: any) => c?.user?.id !== myId) : allComments;
  const showMore = otherComments.length > 3;

  // --- Popover portal anchors & positions ---
  const shareAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const menuAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const [sharePos, setSharePos] = useState<{ top: number; left: number } | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const computePos = useCallback((el: HTMLElement | null) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // Align to the right edge under the button with a small offset
    return { top: Math.round(r.bottom + 6), left: Math.round(r.right) };
  }, []);

  // Recompute positions when popovers open, and on scroll/resize
  React.useEffect(() => {
    if (openShareId === i.id) setSharePos(computePos(shareAnchorRef.current));
    if (openMenuId === i.id) setMenuPos(computePos(menuAnchorRef.current));

    function onWin() {
      if (openShareId === i.id) setSharePos(computePos(shareAnchorRef.current));
      if (openMenuId === i.id) setMenuPos(computePos(menuAnchorRef.current));
    }
    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
    };
  }, [openShareId, openMenuId, i.id, computePos]);

  return (
    <div
      className={`relative rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 text-neutral-900 dark:text-neutral-100 flex flex-col transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md [--brand-ink:#111827] [--brand-ink-subtle:rgba(17,24,39,0.66)] dark:[--brand-ink:#F3F4F6] dark:[--brand-ink-subtle:rgba(243,244,246,0.66)] ${i?.suspended ? 'opacity-60 grayscale' : ''} h-full`}
      style={{
        backgroundImage: 'linear-gradient(0deg, var(--brand-surface-weak, transparent), var(--brand-surface-weak, transparent))'
      }}
    >
      {amAdmin && ((i as any).reportCount ?? 0) > 0 && (
        <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40">
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 18H3L12 3z" fill="currentColor"/></svg>
          <span className="tabular-nums">{(i as any).reportCount}</span>
        </div>
      )}

      {/* TOP RIGHT: Share + Options (buttons) */}
      {!editing && (
        <div className="rs-pop absolute top-1.5 right-1.5 z-20 flex flex-col gap-1.5">
          {showProductCta && (
            <a
              href={productUrl as string}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="w-[26px] h-[26px] md:w-8 md:h-8 grid place-items-center rounded-lg shadow focus:outline-none focus:ring-2"
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
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
            </a>
          )}
          <div className="relative" ref={shareAnchorRef}>
            <button
              className="w-[26px] h-[26px] md:w-8 md:h-8 grid place-items-center rounded-lg border bg-white/80 dark:bg-gray-800/80 focus:outline-none focus:ring-2"
              aria-label="share"
              onClick={handleShareClick}
              style={{
                backgroundColor: 'var(--brand-accent-weak)',
                borderColor: 'color-mix(in srgb, var(--brand-ink) 20%, transparent)',
                ['--tw-ring-color' as any]: 'var(--brand-focus)'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-3 h-3">
                <path d="M12 3v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {typeof window !== 'undefined' && openShareId === i.id && sharePos && createPortal(
              <div
                className="text-neutral-900 dark:text-neutral-100 [--brand-ink:#111827] [--brand-ink-subtle:rgba(17,24,39,0.66)] dark:[--brand-ink:#F3F4F6] dark:[--brand-ink-subtle:rgba(243,244,246,0.66)]"
                style={{ position: 'fixed', top: sharePos.top, left: sharePos.left, zIndex: 1000, transform: 'translateX(-100%)' }}
              >
                <SharePopover
                  open
                  itemId={i.id}
                  itemName={i.name}
                  onClose={() => setOpenShareId(null)}
                  onCopy={onCopyShare}
                  onShare={onNativeShare}
                  copiedShareId={copiedShareId}
                />
              </div>,
              document.body
            )}
          </div>
          <div className="relative" ref={menuAnchorRef}>
            <button
              className="w-[26px] h-[26px] md:w-8 md:h-8 grid place-items-center rounded-lg border bg-white/80 dark:bg-gray-800/80 focus:outline-none focus:ring-2"
              onClick={handleMenuClick}
              aria-label="options"
              style={{
                backgroundColor: 'var(--brand-accent-weak)',
                borderColor: 'color-mix(in srgb, var(--brand-ink) 20%, transparent)',
                ['--tw-ring-color' as any]: 'var(--brand-focus)'
              }}
            >
              ⋯
            </button>
            {typeof window !== 'undefined' && openMenuId === i.id && menuPos && createPortal(
              <div
                className="text-neutral-900 dark:text-neutral-100 [--brand-ink:#111827] [--brand-ink-subtle:rgba(17,24,39,0.66)] dark:[--brand-ink:#F3F4F6] dark:[--brand-ink-subtle:rgba(243,244,246,0.66)]"
                style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 1000, transform: 'translateX(-100%)' }}
              >
                <OptionsPopover
                  open
                  itemId={i.id}
                  amAdmin={!!amAdmin}
                  isSaved={saved}
                  isOwner={!!isOwner}
                  onEdit={() => setEditing(true)}
                  onClose={() => setOpenMenuId(null)}
                  onDelete={(id) => onDelete?.(id)}
                  onToggleSave={(id) => onToggleSave(id)}
                  onReport={(id) => onReport(id)}
                  onShowInList={() => {}}
                  hideShowInList
                />
              </div>,
              document.body
            )}
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="flex-1">
        {editing ? (
          <>
            <ItemEditor
              initial={{
                imageUrl: i?.imageUrl ?? '',
                description: i?.description ?? '',
                tags: Array.isArray(i?.tags) ? [...i.tags] : [],
                productUrl: i?.productUrl ?? '',
              }}
              isBrand={isBrand}
              maxTags={3}
              maxDesc={140}
              saving={saving}
              error={err}
              onCancel={() => {
                setEditing(false);
                setErr(null);
              }}
              onSave={onSaveEditor}
              title={i?.name ?? ''}
            />
          </>
        ) : (
          // NORMAL MODE: mevcut kart görünümü
          <>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0 w-28">
                <button
                  type="button"
                  onClick={() => onOpenSpotlight(i.id)}
                  className="rounded-lg focus:outline-none focus:ring-2"
                  aria-label={`${i.name} spotlight'ı aç`}
                  title={`${i.name} spotlight'ı aç`}
                  style={{ ['--tw-ring-color' as any]: 'var(--brand-focus)' }}
                >
                  <img
                    src={i.imageUrl || '/default-item.svg'}
                    alt={i.name || 'item'}
                    className="w-28 h-28 object-cover rounded-lg"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      if (t.src.endsWith('/default-item.svg')) return;
                      t.onerror = null;
                      t.src = '/default-item.svg';
                    }}
                  />
                </button>
                {i.edited && !isBrand && (
                  <span
                    className="text-[11px] px-2 py-0.5 mt-1 rounded-full border"
                    style={{
                      backgroundColor: 'var(--brand-chip-bg)',
                      borderColor: 'color-mix(in srgb, var(--brand-ink) 18%, transparent)'
                    }}
                  >
                    düzenlendi
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-12 md:pr-20">
                {i?.suspended && (
                  <div className="mb-1 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.335-.214 3.007-1.742 3.007H3.48c-1.528 0-2.492-1.672-1.742-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    Askıda — yalnızca sen görüyorsun
                  </div>
                )}

                <h3 className="text-sm font-medium leading-tight title-wrap md-clamp2" title={i.name} lang="tr">
                  <button
                    type="button"
                    onClick={() => onOpenSpotlight(i.id)}
                    className="text-left hover:underline underline-offset-2 focus:outline-none focus:ring-2 rounded"
                    aria-label={`${i.name} spotlight'ı aç`}
                    title={`${i.name} spotlight'ı aç`}
                    style={{
                      textDecorationColor: 'var(--brand-accent)',
                      ['--tw-ring-color' as any]: 'var(--brand-focus)'
                    }}
                  >
                    {i.name}
                  </button>
                </h3>
                {i.description && <p className="text-sm opacity-80 mt-1 break-words">{i.description}</p>}

                {(i.createdBy || creatorNameRaw) && (
                  <div className="mt-2 flex items-center gap-2 text-xs opacity-80 min-w-0">
                    {creatorAvatarRaw ? (
                      <img
                        src={creatorAvatarRaw}
                        alt={creatorName || 'u'}
                        className="shrink-0 w-5 h-5 rounded-full object-cover"
                        title={creatorName || 'u'}
                      />
                    ) : (
                      <div className="shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px]" title={creatorName || 'u'}>
                        {(creatorName || 'u').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 min-w-0 max-w-full align-middle">
                        {isBrand && brandSlug ? (
                          <Link
                            href={`/brand/${brandSlug}`}
                            className="truncate min-w-0 hover:underline underline-offset-2"
                            title={`${creatorName} profiline git`}
                          >
                            {creatorName}
                          </Link>
                        ) : (
                          <span className="truncate min-w-0">{creatorName}</span>
                        )}
                        {isVerified && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="shrink-0 inline-block -ml-0.5 w-4 h-4 align-middle"
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
                      </span>
                    </div>
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

            {/* Comments (max 3) */}
            {showComments && (
              <div className="mt-2 pt-2 border-t dark:border-gray-800">
                <CommentList
                  itemId={i.id}
                  myId={myId || null}
                  ownerId={ownerId as any}
                  comments={otherComments.slice(0, 3)}
                  totalCount={Array.isArray(i?.comments) ? (i.comments as any[]).length : 0}
                  onVote={onVoteComment}
                  title="Yorumlar"
                  emptyText={otherComments.length === 0 ? 'Henüz başka yorum yok.' : undefined}
                />
                {showMore && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => onOpenSpotlight(i.id)}
                      className="text-xs px-3 h-8 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-800"
                      style={{ borderColor: 'var(--brand-accent-bd)' }}
                    >
                      Tüm yorumları gör
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CommentBox (always at bottom) */}
            {showCommentBox && (
              <div className="mt-3 pt-3 border-t dark:border-gray-800">
                <CommentBox
                  itemId={i.id}
                  myComment={myComment || undefined}
                  onDone={() => {
                    try { onItemChanged && onItemChanged(); } catch {}
                  }}
                  initialRating={0}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}