'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { PhotoIcon } from "@heroicons/react/24/solid";
import { linkifyMentions } from '@/lib/text/linkifyMentions';

export type CommentUser = {
  id?: string | null;
  slug?: string | null; // public profil slug
  name?: string | null;
  maskedName?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
  kind?: "REGULAR" | "BRAND" | string | null;
};

export type SpotComment = {
  id: string;
  text: string;
  rating?: number | null;
  score?: number | null;        // toplam oy (up - down)
  myVote?: 1 | -1 | 0 | null;   // kullanıcının mevcut oyu
  edited?: boolean;
  user?: CommentUser | null;
  images?: Array<{ id?: string; url: string; width?: number; height?: number; blurDataUrl?: string; order?: number }>;
};

export interface CommentListProps {
  itemId: string;
  myId?: string | null;

  /** Gönderiyi paylaşan kullanıcının id'si (owner/publisher) */
  ownerId?: string | null;

  // Gösterilecek yorumlar
  comments: SpotComment[];

  // Oy verme (backend tarafı: POST /api/comments/:id/vote { value })
  onVote: (commentId: string, nextValue: 1 | 0 | -1) => void;

  // “devamını gör/gizle” için mevcut spotlight ölçüm state’leri (opsiyonel)
  expandedComments?: Set<string>;
  setExpandedComments?: (fn: (prev: Set<string>) => Set<string>) => void;
  truncatedComments?: Set<string>;
  measureTruncation?: (id: string) => void;
  commentTextRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;

  // Liste başlığı ve boş durum
  title?: string;               // default: "Yorumlar"
  emptyText?: string;           // default: "Henüz yorum yok."

  /** Item'a girilmiş toplam yorum sayısı (kendi yorumun + kartta listelenmeyenler dahil) */
  totalCount?: number;

  // Kendi yorumunu listede göstermeyi kapat/aç (default: true = gizle)
  hideMyComment?: boolean;

  /** Opsiyonel: Marka kullanıcı için public profil linkini hesapla */
  resolveBrandHref?: (user: CommentUser) => string | undefined;
}

/** isim maskeleme (doğrulanmamış kullanıcılar için) */
function maskName(name?: string | null, isBrand?: boolean) {
  if (isBrand) return name || 'Anonim';
  if (!name) return 'Anonim';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.map(p => (p[0] ?? '').toUpperCase() + '*'.repeat(Math.max(1, p.length - 1))).join(' ');
}

export default function CommentList({
  itemId,
  myId = null,
  ownerId = null,
  comments,
  onVote,
  expandedComments,
  setExpandedComments,
  truncatedComments,
  measureTruncation,
  commentTextRefs,
  title = 'Yorumlar',
  emptyText = 'Henüz yorum yok.',
  totalCount,
  hideMyComment = true,
  resolveBrandHref,
}: CommentListProps) {

  // Normalize incoming comments to always carry an images array
  const safeComments = useMemo(() => {
    return (comments || []).map((c) => ({
      ...c,
      images: Array.isArray((c as any).images) ? (c as any).images : [],
    }));
  }, [comments]);

  // Yerel ölçüm ve state fallback'leri (ItemCard içinde parent state gelmeyebilir)
  const [localTruncated, setLocalTruncated] = useState<Set<string>>(new Set());
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(new Set());
  const localRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const effectiveTruncated = truncatedComments ?? localTruncated;
  const effectiveExpanded = expandedComments ?? localExpanded;
  const setEffectiveExpanded =
    setExpandedComments ?? ((fn: (prev: Set<string>) => Set<string>) => setLocalExpanded(prev => fn(prev)));
  const measure =
    measureTruncation ??
    ((id: string) => {
      const el = (commentTextRefs?.current?.[id]) ?? localRefs.current[id];
      if (!el) return;
      const truncated = el.scrollHeight > (el.clientHeight + 1);
      setLocalTruncated(prev => {
        const next = new Set(prev);
        if (truncated) next.add(id); else next.delete(id);
        return next;
      });
    });

  // Kendi yorumun en üstte gözüksün (varsa), kalanlar tarih/score sırasına göre
  const ordered = useMemo(() => {
    const ownerComments: SpotComment[] = [];
    const mine: SpotComment[] = [];
    const others: SpotComment[] = [];

    for (const c of safeComments) {
      const uid = c?.user?.id || null;

      if (ownerId != null && uid != null && String(uid) === String(ownerId)) {
        ownerComments.push(c);
        continue;
      }

      if (myId && uid === myId) {
        mine.push(c);
      } else {
        others.push(c);
      }
    }

    // Gönderi sahibi kendisi görüntülüyorsa: kendi yorumunu görmesin
    const isOwnerViewingOwnPost = ownerId != null && myId != null && String(ownerId) === String(myId);

    // Sıralama: (1) owner'ın yorum(lar)ı (pin'li), (2) benim yorumlarım (opsiyonel), (3) diğerleri (skorla)
    // Not: owner yorumları oy fark etmeksizin en üstte kalır.
    // İç gruplar içinde basit stabil sıra; istenirse tarih/score ile ayrıca sıralanabilir.

    // Diğerleri: score'a göre azalan
    others.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const list: SpotComment[] = [];

    if (!isOwnerViewingOwnPost && ownerComments.length > 0) {
      list.push(...ownerComments);
    }

    if (!hideMyComment && mine.length > 0) {
      list.push(...mine);
    }

    list.push(...others);

    return list;
  }, [safeComments, myId, ownerId, hideMyComment]);

  // mount/updates: truncate ölçümü
  useEffect(() => {
    for (const c of ordered) {
      if (!c?.id) continue;
      measure(c.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered?.length]);

  function toggleExpand(id: string) {
    setEffectiveExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs opacity-70 tabular-nums">{typeof totalCount === 'number' ? totalCount : ordered.length}</span>
      </div>

      {ordered.length === 0 ? (
        <div className="text-sm opacity-70">
          {safeComments.some(c => c.user?.id === myId) ? "Henüz başka yorum yok." : emptyText}
        </div>
      ) : (
        <ul>
          {ordered.map((c) => {
            // Brand link must be /brand/markaadi and MUST use BrandAccount.slug coming from backend
            const brandSlug = typeof (c.user as any)?.slug === 'string' && (c.user as any).slug.trim().length > 0
              ? (c.user as any).slug
              : undefined;

            const isBrand = (String(c?.user?.kind || "").toUpperCase() === "BRAND") || !!brandSlug;
            const displayName =
              isBrand
                ? (c?.user?.name || "Anonim")
                : (c?.user?.maskedName || maskName(c?.user?.name, false));
            // Brand link must be /brand/markaadi and MUST use BrandAccount.slug coming from backend
            

            const hrefBrand = isBrand
              ? (
                  // Allow parent to override via resolver if provided; otherwise only use slug
                  resolveBrandHref?.(c.user as any) ?? (brandSlug ? `/brand/${encodeURIComponent(brandSlug)}` : undefined)
                )
              : undefined;
            const score = typeof c.score === 'number' ? c.score : 0;
            const myVote = (typeof c.myVote === 'number' ? c.myVote : 0) as 1 | 0 | -1;
            const isExpanded = effectiveExpanded?.has(c.id) ?? false;
            const isTruncated = effectiveTruncated?.has(c.id) ?? false;
          const hasImages = Array.isArray(c.images) && c.images.length > 0;
          // debug: keep minimal in dev only
          if (process.env.NODE_ENV !== 'production' && hasImages) {
            // eslint-disable-next-line no-console
            console.debug('hasImages', c.id, (c.images as any[]).length);
          }

            return (
              <li key={c.id} className="py-2 first:border-t-0 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-start gap-2 px-1">
                  {/* avatar */}
                  {hrefBrand ? (
                    c.user?.avatarUrl ? (
                      <a href={hrefBrand} className="mt-0.5" aria-label="Marka profiline git">
                        <img
                          src={c.user.avatarUrl}
                          alt={displayName || 'u'}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      </a>
                    ) : (
                      <a href={hrefBrand} className="mt-0.5" aria-label="Marka profiline git">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 grid place-items-center text-[10px]">
                          {(displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                      </a>
                    )
                  ) : (
                    c.user?.avatarUrl ? (
                      <img
                        src={c.user.avatarUrl}
                        alt={displayName || 'u'}
                        className="w-6 h-6 rounded-full object-cover mt-0.5"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 grid place-items-center text-[10px] mt-0.5">
                        {(displayName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )
                  )}

                  {/* content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
                      {hrefBrand ? (
                        <a href={hrefBrand} className="truncate hover:underline" title="Marka profili">
                          {displayName}
                        </a>
                      ) : (
                        <span className="truncate">{displayName}</span>
                      )}
                      {isBrand && (
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block align-middle">
                          <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                          <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      <span className="ml-1 inline-flex items-center gap-1 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 text-[11px] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        {Math.max(0, Number(c.rating) || 0)}★
                      </span>
                      {hasImages && (
                        <span
                          className="inline-flex items-center ml-1 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 text-[11px] px-1.5 py-0.5 rounded-full shrink-0"
                          title="Bu yorumda fotoğraf var"
                          aria-label="Bu yorumda fotoğraf var"
                        >
                          <PhotoIcon className="h-4 w-4 opacity-80" />
                        </span>
                      )}
                    </div>

                    {/* metin */}
                    <div
                      ref={(el) => {
                        if (!c.id) return;
                        if (commentTextRefs) commentTextRefs.current[c.id] = el;
                        localRefs.current[c.id] = el;
                      }}
                      className={
                        'text-sm mt-1 whitespace-pre-wrap break-words ' +
                        (!isExpanded ? 'line-clamp-2 ' : '')
                      }
                    >
                      {linkifyMentions(c.text)}
                      {c.edited && (
                        <em className="ml-1 text-xs opacity-60 align-baseline"> (düzenlendi)</em>
                      )}
                    </div>

                    {/* “devamını gör” */}
                    {isTruncated && (
                      <button
                        type="button"
                        className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
                        onClick={() => toggleExpand(c.id)}
                      >
                        {isExpanded ? 'Gizle' : 'Devamını gör'}
                      </button>
                    )}
                  </div>

                  {/* actions: vote (▲ score ▼) */}
                  <div className="flex items-center gap-2 ml-2 shrink-0 select-none text-xs">
                    <button
                      type="button"
                      onClick={() => onVote(c.id, myVote === 1 ? 0 : 1)}
                      className={
                        'leading-none w-5 h-5 grid place-items-center rounded-md transition-colors ' +
                        (myVote === 1
                          ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30'
                          : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300')
                      }
                      aria-label="Beğen (upvote)"
                      title="Beğen (upvote)"
                    >
                      ▲
                    </button>
                    <span className="tabular-nums w-4 text-center text-gray-600 dark:text-gray-300">{score}</span>
                    <button
                      type="button"
                      onClick={() => onVote(c.id, myVote === -1 ? 0 : -1)}
                      className={
                        'leading-none w-5 h-5 grid place-items-center rounded-md transition-colors ' +
                        (myVote === -1
                          ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30'
                          : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300')
                      }
                      aria-label="Beğenme (downvote)"
                      title="Beğenme (downvote)"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}