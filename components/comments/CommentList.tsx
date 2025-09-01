'use client';

import React, { useMemo, useEffect } from 'react';

export type CommentUser = {
  id?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
};

export type SpotComment = {
  id: string;
  text: string;
  rating?: number | null;
  score?: number | null;        // toplam oy (up - down)
  myVote?: 1 | -1 | 0 | null;   // kullanıcının mevcut oyu
  edited?: boolean;
  user?: CommentUser | null;
};

export interface CommentListProps {
  itemId: string;
  myId?: string | null;

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

  // Kendi yorumunu listede göstermeyi kapat/aç (default: true = gizle)
  hideMyComment?: boolean;
}

/** isim maskeleme (doğrulanmamış kullanıcılar için) */
function maskName(name?: string | null, verified?: boolean) {
  if (verified) return name || 'Anonim';
  if (!name) return 'Anonim';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.map(p => (p[0] ?? '').toUpperCase() + '*'.repeat(Math.max(1, p.length - 1))).join(' ');
}

export default function CommentList({
  itemId,
  myId = null,
  comments,
  onVote,
  expandedComments,
  setExpandedComments,
  truncatedComments,
  measureTruncation,
  commentTextRefs,
  title = 'Yorumlar',
  emptyText = 'Henüz yorum yok.',
  hideMyComment = true,
}: CommentListProps) {

  // Kendi yorumun en üstte gözüksün (varsa), kalanlar tarih/score sırasına göre
  const ordered = useMemo(() => {
    const mine: SpotComment[] = [];
    const others: SpotComment[] = [];
    for (const c of comments) {
      if (c?.user?.id && myId && c.user.id === myId) mine.push(c);
      else others.push(c);
    }
    // basitçe score'a göre azalan (yüksek puanlı önce), score yoksa stabil
    others.sort((a,b) => (b.score ?? 0) - (a.score ?? 0));
    return hideMyComment ? others : [...mine, ...others];
  }, [comments, myId, hideMyComment]);

  // mount/updates: truncate ölçümü
  useEffect(() => {
    if (!measureTruncation || !commentTextRefs) return;
    for (const c of ordered) {
      if (!c?.id) continue;
      const el = commentTextRefs.current?.[c.id];
      if (el) measureTruncation(c.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered?.length]);

  function toggleExpand(id: string) {
    if (!setExpandedComments) return;
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs opacity-70 tabular-nums">{ordered.length}</span>
      </div>

      {ordered.length === 0 ? (
        <div className="text-sm opacity-70">{emptyText}</div>
      ) : (
        <ul>
          {ordered.map((c) => {
            const verified = Boolean(c?.user?.verified);
            const displayName = maskName(c?.user?.name, verified);
            const score = typeof c.score === 'number' ? c.score : 0;
            const myVote = (typeof c.myVote === 'number' ? c.myVote : 0) as 1 | 0 | -1;
            const isExpanded = expandedComments?.has(c.id) ?? false;
            const isTruncated = truncatedComments?.has(c.id) ?? false;

            return (
              <li key={c.id} className="py-2 first:border-t-0 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-start gap-2 px-1">
                  {/* avatar */}
                  {c.user?.avatarUrl ? (
                    <img
                      src={c.user.avatarUrl}
                      alt={displayName || 'u'}
                      className="w-6 h-6 rounded-full object-cover mt-0.5"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 grid place-items-center text-[10px] mt-0.5">
                      {(displayName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs opacity-80">
                      <span className="truncate">{displayName}</span>
                      {verified && (
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block align-middle">
                          <circle cx="12" cy="12" r="9" fill="#3B82F6" />
                          <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {typeof c.rating === 'number' && c.rating > 0 && (
                        <span className="ml-1 inline-block bg-emerald-200 text-emerald-900 text-[11px] px-2 py-0.5 rounded-full">
                          {c.rating}★
                        </span>
                      )}
                      {c.edited && (
                        <em className="opacity-60"> (düzenlendi)</em>
                      )}
                    </div>

                    {/* metin */}
                    <div
                      ref={(el) => {
                        if (commentTextRefs && c.id) commentTextRefs.current[c.id] = el;
                      }}
                      className={
                        'text-sm mt-1 ' +
                        (!isExpanded ? 'truncate ' : '')
                      }
                    >
                      {c.text}
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
                  <div className="flex items-center gap-2 ml-2 shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => onVote(c.id, myVote === 1 ? 0 : 1)}
                      className={(myVote === 1
                        ? 'text-emerald-600'
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300') + ' leading-none'}
                      aria-label="Beğen (upvote)"
                      title="Beğen (upvote)"
                    >
                      ▲
                    </button>
                    <span className="tabular-nums w-5 text-center text-gray-600 dark:text-gray-300">{score}</span>
                    <button
                      type="button"
                      onClick={() => onVote(c.id, myVote === -1 ? 0 : -1)}
                      className={(myVote === -1
                        ? 'text-red-600'
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300') + ' leading-none'}
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